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

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Phase 2 Story 5: checks on /api/me, the address that answers "who am I signed
 * in as?".
 *
 * WHY THIS FILE EXISTS
 *
 * /api/me was built in Phase 2 Story 4 and had no tests at all. It is the one
 * address that exercises the whole loop, browser to API to session to database,
 * and Story 5 leans on it twice over: the landing screens read the role from it
 * to decide what to draw, and the account screen reads it to know who is looking.
 * Something two screens depend on should not be the only thing in the app with
 * no coverage.
 *
 * WHY A REAL SIGN-IN RATHER THAN @WithMockUser
 *
 * The other test files use @WithMockUser, which invents an authenticated caller
 * out of nothing. That is right for testing an access rule, because the rule only
 * cares about the role. It is wrong here.
 *
 * @WithMockUser hands the controller a username with no matching database row.
 * The controller would then fail on its own lookup, or, worse, a version of the
 * controller that stopped reading the database and echoed the session back would
 * still pass. Signing in for real and carrying the session forward is what makes
 * these tests prove the database was actually read.
 *
 * HOW THE SESSION IS CARRIED
 *
 * MockMvc treats every request as unrelated to the last one, which is not how a
 * browser behaves. formLogin() produces a request holding a session, so each test
 * pulls that session out and attaches it to the next request by hand. That is the
 * stand-in for the browser sending its JSESSIONID cookie back.
 *
 * @Transactional rolls back everything each test wrote, so accounts created here
 * never leak into another test or survive the run.
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

    /*
     * A player invented for these tests. The person name matters: it is set here
     * and nowhere else, so it exists in one place only, the database row. Nothing
     * in the sign-in carries it, which is the whole point of the first test.
     */
    private static final String PLAYER_USERNAME = "mistytest";
    private static final String PLAYER_PASSWORD = "waterrules1";
    private static final String PLAYER_PERSON_NAME = "Misty Waterflower";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    /*
     * Signs in the way a browser does and hands back the session that resulted.
     *
     * username, password - the credentials to submit.
     *
     * Returns the MockHttpSession created by the sign-in, ready to attach to a
     * later request with .session(...).
     *
     * Raises AssertionError if the sign-in did not authenticate, which fails the
     * calling test at the point the fault actually happened rather than leaving it
     * to show up as a confusing redirect further down.
     *
     * getSession() is cast because MockMvc types it as the plain HttpSession
     * interface. The object really is a MockHttpSession, and .session() will only
     * accept that concrete type.
     */
    private MockHttpSession signIn(String username, String password) throws Exception {
        return (MockHttpSession) mockMvc.perform(formLogin().user(username).password(password))
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

    /*
     * The acceptance criterion the card names: sign in, call /api/me with that
     * session, and get back a field that is stored only in the database.
     *
     * The person name is that field. Signing in submits a username and a password
     * and nothing else, and the session that results carries the username alone.
     * So there is no route by which the person name could reach this answer except
     * the controller reading the row. Asserting on the username instead would
     * prove nothing, because the username was typed in at the top of the test and
     * could simply be echoed back.
     */
    @Test
    void signedInSession_getsBackAPersonNameThatOnlyTheDatabaseKnows() throws Exception {
        createPlayer();

        MockHttpSession session = signIn(PLAYER_USERNAME, PLAYER_PASSWORD);

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personName").value(PLAYER_PERSON_NAME))
                .andExpect(jsonPath("$.username").value(PLAYER_USERNAME));
    }

    /*
     * The role in the answer is the account's real role, not something the caller
     * chose. Story 5's landing screens branch on this value, so a wrong answer
     * here would show a player the owner's screen.
     *
     * The seeded owner is used rather than the invented player, so this and the
     * test above cover both roles between them.
     */
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

    /*
     * The answer names three fields and no more. The controller returns a small
     * map rather than the User object on purpose, and this is the test that keeps
     * it that way: returning the entity would hand out the password hash and the
     * row's internal id, and a column added to the table later would start
     * appearing in the browser on its own.
     */
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

    /*
     * A real answer is JSON. This looks like a test of something too obvious to
     * check, and it is not.
     *
     * Every screen in this project decides whether it is signed in by asking
     * whether this answer is JSON, rather than by looking at the status code. That
     * is because of the test below. If this address ever started answering with
     * something else, or with no content type at all, every one of those screens
     * would conclude the visitor was logged out and bounce them to the login
     * page, on a request that actually succeeded.
     */
    @Test
    void answerToASignedInCaller_saysItIsJson() throws Exception {
        createPlayer();

        MockHttpSession session = signIn(PLAYER_USERNAME, PLAYER_PASSWORD);

        mockMvc.perform(get(ME_URL).session(session))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    /*
     * With no session, this address answers with a redirect to the login screen
     * rather than a 401.
     *
     * That is Spring's default-deny behaviour and it is what the frontend has to
     * work around: a browser follows the redirect without saying so, so what
     * arrives at the calling code is the login page's HTML with a status of 200.
     * Two separate bugs came from screens reading that as success, both recorded
     * in LIVING_DOC.md.
     *
     * Pinning the behaviour here means anyone who later changes it to a clean 401
     * fails this test and is told to go and look at the screens that depend on it,
     * instead of finding out when a failed sign-in silently looks like a
     * successful one.
     */
    @Test
    void noSession_isSentToTheLoginScreenRatherThanRefusedOutright() throws Exception {
        mockMvc.perform(get(ME_URL))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }
}
