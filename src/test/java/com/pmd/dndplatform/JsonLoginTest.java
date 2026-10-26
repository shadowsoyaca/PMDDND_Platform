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
 * Tests for the JSON sign-in endpoint: the account on success, the session it
 * starts, and the identical refusals for bad credentials.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class JsonLoginTest {

    private static final String LOGIN = "/api/login";

    @Autowired
    MockMvc mockMvc;

    /**
     * Builds the JSON body a sign-in is sent as. The JSON is written by hand, not by an object mapper.
     *
     * @param username (String) what to put in the username field.
     * @param password (String) what to put in the password field.
     * @return (String) the JSON text, ready to be used as a request body.
     */
    private String credentials(String username, String password) {
        return "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
    }

    // The endpoint accepts JSON and answers with the account.
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

    // The session the sign-in started works on the next request.
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

    // A wrong password is refused with 401 and a reason, not a redirect.
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

    // An unknown username is refused the same way as a wrong password.
    // The two refusals are compared byte for byte, not merely both checked for 401.
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

    // Without a CSRF token the request is refused with the csrf reason.
    @Test
    void missingCsrfToken_isRefusedWithTheCsrfReason() throws Exception {
        mockMvc.perform(post(LOGIN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(SecurityConfigTest.TEST_USER,
                                             SecurityConfigTest.TEST_PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.reason").value("csrf"));
    }

    // The password never comes back in the answer.
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
