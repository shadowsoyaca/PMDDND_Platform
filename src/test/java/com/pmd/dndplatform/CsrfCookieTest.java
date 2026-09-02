package com.pmd.dndplatform;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.test.context.ActiveProfiles;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * Phase 2 Story 5: the browser must always be holding a usable CSRF token.
 *
 * WHAT WAS BROKEN
 *
 * Every first attempt at anything failed, and every second attempt worked.
 * Signing in took two tries, signing out took two tries, and creating an account
 * took two tries. Measured against a running copy, before the fix:
 *
 *   GET  /login              200, and no Set-Cookie at all
 *   POST /login              403, and only NOW is a token cookie sent
 *   POST /login again        302, signed in, and the cookie is DELETED
 *   POST /api/admin/users    403, and again a token cookie is sent
 *   POST /api/admin/users    201, created
 *
 * Spring Security 6 creates the CSRF token only when something asks for it, and a
 * React page never asks. Nothing wrote the cookie, so the first request needing a
 * token was refused, and the refusal itself wrote the cookie that made the second
 * attempt work. CsrfCookieFilter is the fix and explains the mechanism.
 *
 * WHY THIS TEST USES A REAL SERVER AND NOT MockMvc
 *
 * This was written with MockMvc first, and it lied. MockMvc does not carry
 * cookies from one request to the next, and it substitutes parts of the security
 * plumbing, so a signed-in request there reports a session-stored token and no
 * cookie, which is not what the running application does at all. The test failed
 * while the application was working.
 *
 * A real port with real cookies is the only way to check this honestly, because
 * cookies moving between requests IS the behaviour under test. It costs a couple
 * of seconds and buys a test that agrees with reality.
 *
 * WHY IT IS WORTH THE TROUBLE
 *
 * Nothing about this fault fails loudly. Everything works on the second press, so
 * a person clicks again and carries on, and it reads as the network being slow.
 * It survived long enough to be written into LIVING_DOC.md twice, once as a bug
 * called fixed and once as a bug called intermittent. Neither was true.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "app.owner.username=" + SecurityConfigTest.TEST_USER,
                "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
                "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
        })
@ActiveProfiles("test")
class CsrfCookieTest {

    /* The name Spring writes, and the name the frontend reads in lib/csrf.ts. */
    private static final String TOKEN_COOKIE = "XSRF-TOKEN";

    /* The name of the session cookie, which is what keeps us signed in below. */
    private static final String SESSION_COOKIE = "JSESSIONID";

    @Autowired
    TestRestTemplate rest;

    /*
     * Stops the client following redirects by itself.
     *
     * Without this, the answer to a sign-in is invisible: the client quietly
     * follows the redirect and hands back whatever was at the other end, so the
     * test cannot see where it was sent, and where it was sent is the only thing
     * that says whether the sign-in worked. Spring answers a refusal and a
     * success with the same status and different destinations.
     *
     * A browser follows the redirect too. The difference is that a browser is not
     * trying to inspect the step it skipped.
     */
    @BeforeEach
    void doNotFollowRedirects() {
        rest.getRestTemplate().setRequestFactory(new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String method)
                    throws IOException {
                super.prepareConnection(connection, method);
                connection.setInstanceFollowRedirects(false);
            }
        });
    }

    /*
     * Pulls one cookie's value out of an answer.
     *
     * response - the answer to look in.
     * name     - which cookie.
     *
     * Returns the value, or null if the answer did not set that cookie.
     *
     * A deletion arrives as the same cookie with an empty value, so an empty
     * string coming back is a meaningful result rather than a missing one. That
     * distinction matters here: signing in used to delete the token and set
     * nothing in its place.
     *
     * NOTE - Phase 2 Story 5.5: the LAST match is returned, not the first.
     *
     * One answer can legitimately set the same cookie twice. On a sign-in,
     * CsrfCookieFilter writes the token it can see as the request passes through
     * the filters, and then the controller replaces the token and writes the new
     * one. Both Set-Cookie headers are on the response. A browser keeps the last,
     * so reading the first would check a value the browser has already discarded,
     * and the test would report a stale token as the live one.
     */
    private String cookieValue(ResponseEntity<String> response, String name) {
        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        if (setCookies == null) {
            return null;
        }
        String found = null;
        for (String cookie : setCookies) {
            if (cookie.startsWith(name + "=")) {
                String value = cookie.substring(name.length() + 1);
                int end = value.indexOf(';');
                found = end >= 0 ? value.substring(0, end) : value;
            }
        }
        return found;
    }

    /*
     * NOTE - Phase 2 Story 5.5: the body a sign-in is sent as.
     *
     * Returns the JSON the login screen sends, with the test owner's credentials.
     *
     * Raises nothing.
     *
     * Written by hand rather than through an object mapper so the field names the
     * frontend has to use are stated here in full. If they ever change, this file
     * should have to change too, because the frontend would.
     */
    private String credentials() {
        return "{\"username\":\"" + SecurityConfigTest.TEST_USER
                + "\",\"password\":\"" + SecurityConfigTest.TEST_PASSWORD + "\"}";
    }

    /* Builds headers carrying cookies, and the CSRF token where one is needed. */
    private HttpHeaders headersWith(String cookies, String token) {
        HttpHeaders headers = new HttpHeaders();
        if (cookies != null) {
            headers.add(HttpHeaders.COOKIE, cookies);
        }
        if (token != null) {
            headers.add("X-XSRF-TOKEN", token);
        }
        return headers;
    }

    /*
     * The whole journey, in the order a person actually makes it.
     *
     * Written as one test rather than four because each step depends on the
     * cookies the previous step handed back, which is the entire point. Split
     * apart, each piece would need the others repeated inside it, and the thing
     * being tested, state carried between requests, would be the thing faked.
     */
    @Test
    void everyStepHandsTheBrowserAUsableToken() {
        // ---------------------------------------------------------------------
        // Loading the login screen must hand over a token.
        //
        // Before the fix this answered 200 with no cookie at all, so the screen
        // had nothing to send and the first sign-in was always refused, with a
        // message saying the password did not match.
        // ---------------------------------------------------------------------
        ResponseEntity<String> loginPage =
                rest.exchange("/login", HttpMethod.GET, new HttpEntity<>(headersWith(null, null)), String.class);

        String tokenBefore = cookieValue(loginPage, TOKEN_COOKIE);

        assertThat(tokenBefore)
                .describedAs("loading the login screen wrote no %s cookie, so the "
                        + "first sign-in will be refused", TOKEN_COOKIE)
                .isNotNull()
                .isNotBlank();

        // ---------------------------------------------------------------------
        // The FIRST sign-in attempt must work.
        // ---------------------------------------------------------------------
        /*
         * NOTE - Phase 2 Story 5.5: the sign-in is JSON now rather than a form
         * post, and it goes to /api/login rather than /login. What is being proven
         * is unchanged: the FIRST attempt must work.
         */
        HttpHeaders signInHeaders = headersWith(TOKEN_COOKIE + "=" + tokenBefore, tokenBefore);
        signInHeaders.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> signIn = rest.exchange(
                "/api/login", HttpMethod.POST,
                new HttpEntity<>(credentials(), signInHeaders), String.class);

        /*
         * NOTE - Phase 2 Story 5.5: this used to read the redirect's destination,
         * because form login answered a success and a refusal with the same status
         * and only a different location. The endpoint says which happened outright,
         * so the status is the answer now and there is nothing left to infer.
         */
        assertThat(signIn.getStatusCode().value())
                .describedAs("the first sign-in attempt was refused")
                .isEqualTo(200);

        String session = cookieValue(signIn, SESSION_COOKIE);
        assertThat(session)
                .describedAs("the sign-in started no session")
                .isNotNull();

        // ---------------------------------------------------------------------
        // The sign-in answer must itself hand over a FRESH token.
        //
        // This is the half that was really broken. Authentication throws the old
        // token away, correctly, so one picked up before signing in cannot be
        // reused afterwards. The replacement was never written, so the browser
        // held nothing at the exact moment it was about to be used, and the first
        // change made afterwards always failed.
        //
        // NOTE - Phase 2 Story 5.5: this used to be checked on the NEXT request.
        // Form login sent its redirect and stopped the filter chain there, so the
        // new token could not travel with it, and the browser only picked one up
        // because it followed the redirect immediately. A controller answers in
        // the same response, so the fresh token now arrives with the sign-in and
        // the screen can make its next change without a round trip in between.
        // ---------------------------------------------------------------------
        String tokenAfter = cookieValue(signIn, TOKEN_COOKIE);

        assertThat(tokenAfter)
                .describedAs("no %s cookie on the sign-in answer, so the first change "
                        + "made afterwards will be refused", TOKEN_COOKIE)
                .isNotNull()
                .isNotBlank();
        assertThat(tokenAfter)
                .describedAs("the token did not change when signing in, so one "
                        + "obtained before authenticating still works afterwards")
                .isNotEqualTo(tokenBefore);

        // ---------------------------------------------------------------------
        // And the FIRST change made with that token must be accepted.
        //
        // This is the end the person actually cares about. Everything above can
        // be right in principle and still leave the owner pressing Create twice.
        // Nothing is created: the request is deliberately one the validation
        // refuses, so a 400 proves it got past the CSRF check, and a 403 proves
        // it did not.
        // ---------------------------------------------------------------------
        HttpHeaders changeHeaders = headersWith(
                TOKEN_COOKIE + "=" + tokenAfter + "; " + SESSION_COOKIE + "=" + session,
                tokenAfter);
        changeHeaders.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> change = rest.exchange(
                "/api/admin/users", HttpMethod.POST,
                new HttpEntity<>("{\"username\":\"x\",\"password\":\"x\",\"personName\":\"\"}", changeHeaders),
                String.class);

        assertThat(change.getStatusCode().value())
                .describedAs("the first change after signing in was refused over its "
                        + "CSRF token, which is the fault this whole file exists for")
                .isEqualTo(400);
    }

    /*
     * Phase 2 Story 5.5: signing in must hand back a NEW session id.
     *
     * WHAT THIS PROTECTS AGAINST
     *
     * Session fixation. If signing in keeps whatever session id the browser was
     * already carrying, then somebody who knew that id beforehand now knows the id
     * of a session that is signed in. They do not steal it afterwards. They arrange
     * to know it in advance and wait.
     *
     * The defence is to throw the old id away at the moment of signing in and
     * issue a new one, which makes anything known beforehand worthless.
     *
     * WHY IT STILL MATTERS EVEN THOUGH THIS APPLICATION LOOKS SAFE TODAY
     *
     * Measured on September 2, 2026: a logged-out visitor here holds no session at
     * all. A logged-out request to /accounts answers 302 and sets XSRF-TOKEN only,
     * with no JSESSIONID, because the CSRF token lives in a cookie rather than in
     * the session and nothing else writes to one before a sign-in.
     *
     * So there is currently nothing to fix a session onto. That is a property of
     * what the application happens to store today, not a decision anybody made,
     * and it would stop being true the moment something keeps state for a
     * logged-out visitor. Relying on it would be relying on an accident.
     *
     * WHY THIS NEEDS ITS OWN TEST NOW
     *
     * Spring's form login filter did this on its own. Phase 2 Story 5.5 replaced
     * that filter with a controller, and a controller does not. It is now
     * something the code has to remember, and nothing looks or behaves wrong if it
     * is forgotten: signing in still works, the session still works, and every
     * other test in this project still passes. That combination is exactly how a
     * security hole survives.
     */
    @Test
    void signingIn_replacesTheSessionId() {
        /*
         * The first sign-in is setup, not the thing under test. Its only job is to
         * produce a session id, because as described above nothing else in this
         * application creates one. The second sign-in is the one being tested.
         */
        ResponseEntity<String> loginPage = rest.exchange(
                "/login", HttpMethod.GET,
                new HttpEntity<>(headersWith(null, null)), String.class);

        String firstToken = cookieValue(loginPage, TOKEN_COOKIE);

        HttpHeaders firstHeaders = headersWith(TOKEN_COOKIE + "=" + firstToken, firstToken);
        firstHeaders.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> first = rest.exchange(
                "/api/login", HttpMethod.POST,
                new HttpEntity<>(credentials(), firstHeaders), String.class);

        String sessionBefore = cookieValue(first, SESSION_COOKIE);
        String secondToken = cookieValue(first, TOKEN_COOKIE);

        assertThat(sessionBefore)
                .describedAs("the setup sign-in started no session, so there is no id to "
                        + "compare against and nothing below proves anything")
                .isNotNull();

        /*
         * The sign-in under test, carrying the session and the token the first one
         * handed back. This is a browser that already holds a session id at the
         * moment it authenticates, which is the situation the defence is for.
         */
        HttpHeaders secondHeaders = headersWith(
                SESSION_COOKIE + "=" + sessionBefore + "; " + TOKEN_COOKIE + "=" + secondToken,
                secondToken);
        secondHeaders.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> second = rest.exchange(
                "/api/login", HttpMethod.POST,
                new HttpEntity<>(credentials(), secondHeaders), String.class);

        assertThat(second.getStatusCode().value())
                .describedAs("the sign-in under test was refused, so nothing below "
                        + "proves anything")
                .isEqualTo(200);

        assertThat(cookieValue(second, SESSION_COOKIE))
                .describedAs("signing in issued no new session id, so an id the browser "
                        + "already held is still valid after authenticating")
                .isNotNull()
                .isNotEqualTo(sessionBefore);
    }
}
