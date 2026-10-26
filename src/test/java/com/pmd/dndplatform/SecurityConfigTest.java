package com.pmd.dndplatform;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.unauthenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Tests for the security configuration: protected routes, the login endpoint,
 * the password encoder, and the /health address check. The app.owner.*
 * properties seed the owner row in the test database at startup.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    static final String TEST_USER = "testowner";
    static final String TEST_PASSWORD = "testpass123";
    static final String TEST_HASH = "$2b$10$bAe1ZGhX8mLEvyx/z3Rm6OUIRul.mTB4F.J/k/QqLwu9wTK8WGite";
    static final String TEST_PERSON_NAME = "Test Owner";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    PasswordEncoder passwordEncoder;

    // Asks for a route behind the default-deny rule.
    @Test
    void protectedRoute_whenLoggedOut_isSentToLogin() throws Exception {
        mockMvc.perform(get("/roster"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    void loginPage_isReachableWhenLoggedOut() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk());
    }

    /*
     * Builds the JSON body the login endpoint takes.
     *
     * @param username (String) the login name.
     * @param password (String) the plain password.
     * @return (String) the JSON body.
     */
    private String credentials(String username, String password) {
        return "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    void correctPassword_logsIn() throws Exception {
        mockMvc.perform(post("/api/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(TEST_USER, TEST_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(authenticated());
    }

    @Test
    void wrongPassword_isRejected() throws Exception {
        mockMvc.perform(post("/api/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(TEST_USER, "not-the-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(unauthenticated());
    }

    @Test
    void bcryptIsTheEncoderInUse() {
        assertThat(passwordEncoder).isInstanceOf(BCryptPasswordEncoder.class);
        assertThat(passwordEncoder.matches(TEST_PASSWORD, TEST_HASH)).isTrue();
    }

    // MockMvc sends requests from 127.0.0.1 by default.
    @Test
    void health_fromThisMachine_isAllowed() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
    }

    // An outside address gets the login redirect, not the /health text.
    @Test
    void health_fromOutsideAddress_isBlocked() throws Exception {
        mockMvc.perform(get("/health").with(request -> {
                    request.setRemoteAddr("203.0.113.10");
                    return request;
                }))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }
}