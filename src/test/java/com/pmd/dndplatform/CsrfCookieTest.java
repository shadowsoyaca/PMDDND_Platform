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
 * Checks, on a real server port with real cookies, that the browser holds a
 * usable CSRF token at every step: loading the login screen, signing in, and
 * making the first change afterwards. Also checks sign-in issues a new session id.
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

    /* Stops the client following redirects by itself. */
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

    /**
     * Pulls one cookie's value out of an answer. The last match is returned,
     * not the first: a sign-in answer sets XSRF-TOKEN twice. An empty string is
     * a meaningful value, not a miss, since a deletion arrives as an empty value.
     *
     * @param response (ResponseEntity<String>) the answer to look in.
     * @param name (String) which cookie.
     * @return (String) the value, or null if the answer did not set that cookie.
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

    /**
     * Builds the JSON body a sign-in is sent as, with both field names written out.
     *
     * @return (String) the JSON the login screen sends, with the test owner's credentials.
     */
    private String credentials() {
        return "{\"username\":\"" + SecurityConfigTest.TEST_USER
                + "\",\"password\":\"" + SecurityConfigTest.TEST_PASSWORD + "\"}";
    }

    /**
     * Builds headers carrying cookies, and the CSRF token where one is needed.
     *
     * @param cookies (String) the Cookie header value, or null for none.
     * @param token (String) the X-XSRF-TOKEN value, or null for none.
     * @return (HttpHeaders) the headers.
     */
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
     * The whole journey in one test, in the order a person makes it. Each step
     * uses the cookies the previous step handed back.
     */
    @Test
    void everyStepHandsTheBrowserAUsableToken() {
        // ---------------------------------------------------------------------
        // Loading the login screen must hand over a token.
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
        HttpHeaders signInHeaders = headersWith(TOKEN_COOKIE + "=" + tokenBefore, tokenBefore);
        signInHeaders.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> signIn = rest.exchange(
                "/api/login", HttpMethod.POST,
                new HttpEntity<>(credentials(), signInHeaders), String.class);

        assertThat(signIn.getStatusCode().value())
                .describedAs("the first sign-in attempt was refused")
                .isEqualTo(200);

        String session = cookieValue(signIn, SESSION_COOKIE);
        assertThat(session)
                .describedAs("the sign-in started no session")
                .isNotNull();

        // ---------------------------------------------------------------------
        // The sign-in answer must itself hand over a FRESH token, different
        // from the one issued before signing in.
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
        // And the FIRST change made with that token must pass the CSRF check.
        // The body is deliberately one validation refuses, so nothing is
        // created: a 400 proves it passed the CSRF check, a 403 proves it did not.
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
     * Signing in must hand back a new session id, different from the one the
     * browser already held.
     */
    @Test
    void signingIn_replacesTheSessionId() {
        // The first sign-in is setup. Its only job is to produce a session id.
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

        // The sign-in under test, carrying the session and token the first one handed back.
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
