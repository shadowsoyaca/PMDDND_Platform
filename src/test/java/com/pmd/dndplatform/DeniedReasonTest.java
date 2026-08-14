package com.pmd.dndplatform;

import com.pmd.dndplatform.user.dto.CreateUserRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Phase 2 Story 5: checks that a refusal says which kind of refusal it is.
 *
 * WHY THIS MATTERS ENOUGH TO TEST
 *
 * Two very different things arrive at the browser as 403, and they need opposite
 * responses from the person looking at the screen:
 *
 *   a player asking for account data   - permanent. Trying again never helps.
 *   a CSRF token that was not accepted - clears on a page reload.
 *
 * Before this, the screens could only see the status and told everyone the first
 * story. The owner hitting a token problem was informed they did not have
 * permission to manage their own platform.
 *
 * These tests pin the one word that tells them apart. Without them, a later
 * change to the security configuration could quietly drop the handler, every
 * refusal would go back to looking identical, and nothing would fail.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DeniedReasonTest {

    private static final String ADMIN_URL = "/api/admin/users";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    private String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    /*
     * A missing CSRF token, from the owner, who is allowed to do this.
     *
     * Note the absence of .with(csrf()) below. Every other test in this project
     * includes it, because a state-changing request without a token is refused.
     * This one leaves it out on purpose: being refused is the point.
     */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void missingCsrfToken_saysItWasTheToken() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.reason").value("csrf"));
    }

    /*
     * A player who is not allowed, with a perfectly good token. Same status,
     * different reason, and this is the one the screens must not describe as a
     * token problem.
     */
    @Test
    @WithMockUser(username = "someplayer", roles = "PLAYER")
    void refusedForLackingPermission_saysSoInstead() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("sneaky", "password123", "Sneaky Person"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.reason").value("forbidden"));
    }

    /*
     * A visitor with no session at all still goes to the login screen, and does
     * not reach the handler.
     *
     * This is the test that proves the new handler did not quietly change what an
     * unauthenticated visitor sees, which is the one behaviour in this
     * application that must not move: the login screen is the only thing they can
     * reach. A 403 carrying a reason would be a worse answer AND a leak of the
     * fact that the address exists.
     */
    @Test
    void noSessionAtAll_isStillSentToTheLoginScreen() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("nobody", "password123", "Nobody"))))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }
}
