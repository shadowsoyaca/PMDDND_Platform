package com.pmd.dndplatform;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.unauthenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Phase 2 Story 2 checks, still standing. These prove the lock behaves the way the
 * story asks:
 *  - a logged-out visitor is turned away from a protected route,
 *  - the login page is reachable without logging in,
 *  - the right password gets in, the wrong one does not,
 *  - BCrypt is the encoder actually in use,
 *  - /health answers a local request but not an outside one.
 *
 * Phase 2 STORY 3 CHANGE: the owner account is no longer invented in memory. The three
 * app.owner.* values below now seed a real row in the test database at startup,
 * so "correctPassword_logsIn" is now proving the DATABASE login path works, not
 * an in-memory one. The test is unchanged; what it proves got stronger.
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

    @Test
    void protectedRoute_whenLoggedOut_isSentToLogin() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }

    @Test
    void loginPage_isReachableWhenLoggedOut() throws Exception {
        mockMvc.perform(get("/login"))
                .andExpect(status().isOk());
    }

    @Test
    void correctPassword_logsIn() throws Exception {
        mockMvc.perform(formLogin().user(TEST_USER).password(TEST_PASSWORD))
                .andExpect(authenticated());
    }

    @Test
    void wrongPassword_isRejected() throws Exception {
        mockMvc.perform(formLogin().user(TEST_USER).password("not-the-password"))
                .andExpect(unauthenticated());
    }

    @Test
    void bcryptIsTheEncoderInUse() {
        assertThat(passwordEncoder).isInstanceOf(BCryptPasswordEncoder.class);
        assertThat(passwordEncoder.matches(TEST_PASSWORD, TEST_HASH)).isTrue();
    }

    /*
     * MockMvc uses 127.0.0.1 as the request address by default, so this stands
     * in for the deploy script polling /health on the server.
     */
    @Test
    void health_fromThisMachine_isAllowed() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
    }

    /*
     * An outside address is refused. Because the caller is not logged in, the
     * refusal shows up as a redirect to the login page, not the /health text.
     */
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