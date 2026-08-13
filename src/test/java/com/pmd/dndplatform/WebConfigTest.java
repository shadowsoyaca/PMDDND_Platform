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
 * Phase 2 Story 5: checks that the React app's screens survive being typed into
 * the address bar.
 *
 * WHY THIS IS WORTH TESTING
 *
 * The React app draws its screens in the browser. There is only one real file,
 * index.html, so /accounts is a screen inside a program rather than a file on
 * disk. Spring answers 404 for it unless WebConfig forwards it to index.html.
 *
 * Forgetting that line has a distinctive symptom: clicking through to the screen
 * from inside the app works perfectly, and typing its address or pressing reload
 * gives a 404. Everything looks fine right up until someone bookmarks the page or
 * refreshes it. WebConfig warns about this in prose, and this file is the check
 * that makes the warning bite.
 *
 * WHY forwardedUrl RATHER THAN LOOKING FOR THE PAGE ITSELF
 *
 * MockMvc records a forward and does not carry it out. That is useful here: the
 * frontend is not built during a backend test run, so index.html is not on the
 * classpath and there would be nothing to find. What is being tested is that
 * Spring was told where to send the request, which is exactly what the recorded
 * forward shows.
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
     * A player typing the address also reaches the app, and that is correct
     * rather than a hole.
     *
     * The address serves a screen. The screen then asks for the account data and
     * is refused by the OWNER rule on /api/admin/, which UserAdminTest covers. So
     * what a player gets here is a page that tells them they cannot see it, and
     * no account data leaves the server.
     *
     * This test exists to stop someone "fixing" that by putting an OWNER rule on
     * the address as well. Doing so would put the same rule in two places, which
     * is how the two end up disagreeing.
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
