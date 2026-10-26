package com.pmd.dndplatform;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Checks that WebConfig forwards the React app's addresses to index.html when
 * typed into the address bar. MockMvc records the forward without carrying it
 * out, and forwardedUrl reads that record.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WebConfigTest {

    @Autowired
    MockMvc mockMvc;

    /* Typing the address as the owner reaches the app rather than a 404. */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void accountsAddress_typedByTheOwner_servesTheApp() throws Exception {
        mockMvc.perform(get("/accounts"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    /*
     * A player typing the address reaches the app too. There is no OWNER rule
     * on this address; the rule is on /api/admin/, which UserAdminTest covers.
     */
    @Test
    @WithMockUser(username = "someplayer", roles = "PLAYER")
    void accountsAddress_typedByAPlayer_servesTheAppAndNoData() throws Exception {
        mockMvc.perform(get("/accounts"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    /* A logged-out visitor never gets that far. They see the login screen. */
    @Test
    void accountsAddress_whenLoggedOut_isSentToTheLoginScreen() throws Exception {
        mockMvc.perform(get("/accounts"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }
}
