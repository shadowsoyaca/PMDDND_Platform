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
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

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
     */
    private String cookieValue(ResponseEntity<String> response, String name) {
        List<String> setCookies = response.getHeaders().get(HttpHeaders.SET_COOKIE);
        if (setCookies == null) {
            return null;
        }
        for (String cookie : setCookies) {
            if (cookie.startsWith(name + "=")) {
                String value = cookie.substring(name.length() + 1);
                int end = value.indexOf(';');
                return end >= 0 ? value.substring(0, end) : value;
            }
        }
        return null;
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
        MultiValueMap<String, String> credentials = new LinkedMultiValueMap<>();
        credentials.add("username", SecurityConfigTest.TEST_USER);
        credentials.add("password", SecurityConfigTest.TEST_PASSWORD);

        HttpHeaders signInHeaders = headersWith(TOKEN_COOKIE + "=" + tokenBefore, tokenBefore);
        signInHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        ResponseEntity<String> signIn = rest.exchange(
                "/login", HttpMethod.POST, new HttpEntity<>(credentials, signInHeaders), String.class);

        /*
         * Spring answers a sign-in with a redirect either way, so the status
         * alone says nothing. Where it points is what tells success from failure:
         * "/" on the way in, "/login?error" on a refusal. A refused CSRF token
         * would show as the latter.
         */
        assertThat(signIn.getHeaders().getLocation())
                .describedAs("the first sign-in attempt was refused")
                .isNotNull();
        assertThat(signIn.getHeaders().getLocation().getPath())
                .describedAs("the first sign-in attempt was refused")
                .isEqualTo("/");

        String session = cookieValue(signIn, SESSION_COOKIE);
        assertThat(session).isNotNull();

        // ---------------------------------------------------------------------
        // The page the browser lands on must hand over a FRESH token.
        //
        // This is the half that was really broken. Authentication throws the old
        // token away, correctly, so one picked up before signing in cannot be
        // reused afterwards. The replacement was never written, so the browser
        // held nothing at the exact moment it was about to be used, and the first
        // change made afterwards always failed.
        //
        // The sign-in answer itself cannot carry the new token, because form
        // login sends its redirect and stops the filter chain there. That is fine:
        // a browser follows the redirect at once, and this is that request.
        // ---------------------------------------------------------------------
        ResponseEntity<String> landing = rest.exchange(
                "/", HttpMethod.GET,
                new HttpEntity<>(headersWith(SESSION_COOKIE + "=" + session, null)),
                String.class);

        String tokenAfter = cookieValue(landing, TOKEN_COOKIE);

        assertThat(tokenAfter)
                .describedAs("no %s cookie after signing in, so the first change "
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
}
