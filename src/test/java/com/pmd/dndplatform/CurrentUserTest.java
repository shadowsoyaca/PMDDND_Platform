package com.pmd.dndplatform;

import com.pmd.dndplatform.user.Role;
import com.pmd.dndplatform.user.User;
import com.pmd.dndplatform.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Checks on /api/me, the address that answers who is signed in. Each test
 * signs in through /api/login and attaches the resulting session by hand.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CurrentUserTest {

    private static final String ME_URL = "/api/me";

    /* A player invented for these tests. The person name is set here and nowhere else. */
    private static final String PLAYER_USERNAME = "mistytest";
    private static final String PLAYER_PASSWORD = "waterrules1";
    private static final String PLAYER_PERSON_NAME = "Misty Waterflower";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    /**
     * Signs in through /api/login and hands back the session that resulted.
     * The status is checked alongside authenticated(), which on its own can
     * pass for the wrong reason.
     *
     * @param username (String) the username to submit.
     * @param password (String) the password to submit.
     * @return (MockHttpSession) the session the sign-in created, cast from the HttpSession MockMvc types it as.
     * @throws AssertionError if the sign-in did not answer 200 and authenticate.
     * @throws Exception whatever MockMvc raises.
     */
    private MockHttpSession signIn(String username, String password) throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username
                                + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andExpect(authenticated())
                .andReturn()
                .getRequest()
                .getSession();
    }

    /* Puts a player account straight into the database, hashed as a real one is. */
    private User createPlayer() {
        return userRepository.save(new User(
                PLAYER_USERNAME,
                passwordEncoder.encode(PLAYER_PASSWORD),
                PLAYER_PERSON_NAME,
                Role.PLAYER
        ));
    }

    // -------------------------------------------------------------------------
    // The signed-in loop
    // -------------------------------------------------------------------------

    /* The person name is held only in the database row. Nothing in the sign-in carries it. */
    @Test
    void signedInSession_getsBackAPersonNameThatOnlyTheDatabaseKnows() throws Exception {
        createPlayer();

        MockHttpSession session = signIn(PLAYER_USERNAME, PLAYER_PASSWORD);

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personName").value(PLAYER_PERSON_NAME))
                .andExpect(jsonPath("$.username").value(PLAYER_USERNAME));
    }

    /* Uses the seeded owner, so this and the test above cover both roles between them. */
    @Test
    void signedInSession_getsBackTheRoleTheAccountActuallyHas() throws Exception {
        MockHttpSession session = signIn(SecurityConfigTest.TEST_USER, SecurityConfigTest.TEST_PASSWORD);

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("OWNER"))
                .andExpect(jsonPath("$.personName").value(SecurityConfigTest.TEST_PERSON_NAME));
    }

    // -------------------------------------------------------------------------
    // What must never come back
    // -------------------------------------------------------------------------

    /* The answer names three fields and no more. */
    @Test
    void answer_carriesNoPasswordHashAndNoInternalId() throws Exception {
        createPlayer();

        MockHttpSession session = signIn(PLAYER_USERNAME, PLAYER_PASSWORD);

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.enabled").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // The two answers the frontend has to tell apart
    // -------------------------------------------------------------------------

    /* The content type assertion is the server half of the frontend's session detection. */
    @Test
    void answerToASignedInCaller_saysItIsJson() throws Exception {
        createPlayer();

        MockHttpSession session = signIn(PLAYER_USERNAME, PLAYER_PASSWORD);

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    /*
     * With no session the answer is a redirect to the login screen, not a 401.
     * The frontend's session detection reads it that way.
     */
    @Test
    void noSession_isSentToTheLoginScreenRatherThanRefusedOutright() throws Exception {
        mockMvc.perform(get(ME_URL))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }
}
