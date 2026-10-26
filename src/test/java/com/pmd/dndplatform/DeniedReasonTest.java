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
 * Checks that a 403 carries the reason word saying which kind of refusal it
 * was. The two words asserted here are the ones lib/http.ts reads by name.
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

    /* A missing CSRF token from the owner. This test deliberately omits .with(csrf()). */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void missingCsrfToken_saysItWasTheToken() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.reason").value("csrf"));
    }

    /* A player with a good token: the same status and the other reason word. */
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

    /* A visitor with no session goes to the login screen and never reaches the handler. */
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
