package com.pmd.dndplatform;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.unauthenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Phase 2 Story 5.5: the JSON sign-in endpoint answers with data, not a redirect.
 *
 * WHAT THIS FILE IS FOR
 *
 * Phase 2 Story 4 built the login screen on top of Spring Security's form login,
 * which answers a sign-in with a redirect whether it worked or not. The screen
 * therefore could not tell a wrong password from a server it could not reach, and
 * had to show one vague message covering both. Story 5.5 replaces that with an
 * endpoint that says which of the three things happened.
 *
 * The three answers, and why each is a separate case:
 *
 *   200  signed in. Carries the account, so the screen does not have to ask
 *        /api/me afterwards to find out whether it worked.
 *   401  refused. The credentials were not accepted.
 *   403  the CSRF token was missing or wrong. Written by DeniedReasonHandler,
 *        which already existed. A reload fixes it, so it must not be reported
 *        to the person as a wrong password.
 *
 * WHY MockMvc HERE AND A REAL SERVER IN CsrfCookieTest
 *
 * Everything below is about one request and the answer to it, which MockMvc
 * models honestly and quickly. What MockMvc cannot do is carry cookies from one
 * request to the next, so the two things that depend on that, replacing the
 * session id and replacing the CSRF token, are proven in CsrfCookieTest against a
 * real server instead. Splitting them that way keeps one slow test rather than
 * two.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JsonLoginTest {

    /* The endpoint this story adds. Under /api/ because it answers with data. */
    private static final String LOGIN = "/api/login";

    @Autowired
    MockMvc mockMvc;

    /*
     * Builds the JSON body a sign-in is sent as.
     *
     * username - what to put in the username field.
     * password - what to put in the password field.
     *
     * Returns the JSON text, ready to be used as a request body.
     *
     * Raises nothing.
     *
     * Written by hand rather than with an object mapper so the test states the
     * exact shape the frontend sends. If the endpoint's field names ever change,
     * this file should have to change too, because the frontend would.
     */
    private String credentials(String username, String password) {
        return "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
    }

    /*
     * The endpoint accepts JSON and answers with the account.
     *
     * The body matters as much as the status. The login screen reads these three
     * fields and then stops, where before it had to make a second request to
     * /api/me to discover whether the sign-in had worked at all.
     */
    @Test
    void correctCredentials_answerWithTheAccount() throws Exception {
        mockMvc.perform(post(LOGIN)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(SecurityConfigTest.TEST_USER,
                                             SecurityConfigTest.TEST_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.username").value(SecurityConfigTest.TEST_USER))
                .andExpect(jsonPath("$.personName").value(SecurityConfigTest.TEST_PERSON_NAME))
                .andExpect(jsonPath("$.role").value("OWNER"))
                .andExpect(authenticated());
    }

    /*
     * The session the sign-in started actually works on the next request.
     *
     * This is the one that would catch the trap in this story's approach. Since
     * Spring Security 6 the security context is NOT saved to the session
     * automatically, so a controller that authenticates and forgets to save it
     * answers 200, looks entirely successful, and leaves the next request with no
     * session at all. Checking the status of the sign-in alone would not notice.
     */
    @Test
    void theSessionFromASignIn_worksOnTheNextRequest() throws Exception {
        MockHttpSession session = (MockHttpSession) mockMvc.perform(post(LOGIN)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(SecurityConfigTest.TEST_USER,
                                             SecurityConfigTest.TEST_PASSWORD)))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);

        assertThat(session)
                .describedAs("the sign-in started no session at all")
                .isNotNull();

        mockMvc.perform(get("/api/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value(SecurityConfigTest.TEST_USER));
    }

    /*
     * A wrong password is refused with 401 and a reason, not a redirect.
     *
     * 401 rather than 403 on purpose. 403 in this application means "signed in
     * and not allowed", which DeniedReasonHandler writes, and a refused sign-in is
     * not that. Keeping them apart is what lets the screen tell a bad password
     * from a rejected token.
     */
    @Test
    void wrongPassword_isRefusedWith401() throws Exception {
        mockMvc.perform(post(LOGIN)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(SecurityConfigTest.TEST_USER, "not-the-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.reason").value("bad-credentials"))
                .andExpect(unauthenticated());
    }

    /*
     * An unknown username is refused in exactly the same way as a wrong password.
     *
     * The two answers are compared byte for byte rather than merely both being
     * 401. Anything that differs, a different reason word or a different message,
     * tells whoever is asking which usernames exist on this server, and that is
     * the one thing the card's notes say not to give away.
     *
     * A disabled account belongs in this group too and cannot be tested here,
     * because no disabled account exists until Phase 2 Story 8 builds the switch
     * that makes one.
     */
    @Test
    void unknownUsername_isRefusedIdenticallyToAWrongPassword() throws Exception {
        String wrongPassword = mockMvc.perform(post(LOGIN)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(SecurityConfigTest.TEST_USER, "not-the-password")))
                .andReturn().getResponse().getContentAsString();

        String noSuchAccount = mockMvc.perform(post(LOGIN)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials("nobody-by-that-name", "not-the-password")))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(noSuchAccount)
                .describedAs("an unknown username answers differently from a wrong "
                        + "password, which tells an attacker which usernames exist")
                .isEqualTo(wrongPassword);
    }

    /*
     * Without a CSRF token the request is refused, and says it was the token.
     *
     * The distinction is the whole reason DeniedReasonHandler exists. "Your token
     * was rejected" clears on a page reload and "you are not allowed" does not, so
     * reporting one as the other sends the person somewhere useless.
     */
    @Test
    void missingCsrfToken_isRefusedWithTheCsrfReason() throws Exception {
        mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(SecurityConfigTest.TEST_USER,
                                             SecurityConfigTest.TEST_PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.reason").value("csrf"));
    }

    /*
     * The password never comes back in the answer.
     *
     * Cheap to check and worth checking. This endpoint is the only place in the
     * application that receives a password in a request body, so it is the only
     * place that could echo one into a browser, a log, or a screenshot. A record
     * that is returned rather than mapped is an easy mistake to make and an
     * invisible one afterwards.
     */
    @Test
    void theAnswerNeverContainsTheSubmittedPassword() throws Exception {
        String body = mockMvc.perform(post(LOGIN)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(SecurityConfigTest.TEST_USER,
                                             SecurityConfigTest.TEST_PASSWORD)))
                .andReturn().getResponse().getContentAsString();

        assertThat(body)
                .describedAs("the sign-in answer contains the password that was sent to it")
                .doesNotContain(SecurityConfigTest.TEST_PASSWORD);
    }
}
