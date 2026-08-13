package com.pmd.dndplatform;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pmd.dndplatform.user.Role;
import com.pmd.dndplatform.user.User;
import com.pmd.dndplatform.user.UserRepository;
import com.pmd.dndplatform.user.dto.CreateUserRequest;
import com.pmd.dndplatform.user.dto.UpdateUserRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Phase 2 Story 3 checks. Every acceptance criterion in the story has a test here.
 *
 * Two annotations do a lot of quiet work:
 *
 *  @ActiveProfiles("test") - points at the pmd_dnd_test database, so no test
 *      ever touches real accounts.
 *
 *  @Transactional - everything a test writes is rolled back when it finishes.
 *      Tests therefore never leak accounts into each other, and can be run in
 *      any order, any number of times, with the same result.
 *
 * .with(csrf()) appears on every POST, PUT and DELETE. CSRF protection is on,
 * so a state-changing request without a token is refused. That helper supplies
 * one, which is exactly what a real browser will do.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserAdminTest {

    private static final String ADMIN_URL = "/api/admin/users";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    ObjectMapper objectMapper;

    /* Turns a request object into the JSON the browser would actually send. */
    private String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    // -------------------------------------------------------------------------
    // The owner seed
    // -------------------------------------------------------------------------

    /*
     * The in-memory owner from Story 2 is gone. This proves the replacement:
     * the owner is now a real row in the database, planted at startup.
     */
    @Test
    void ownerAccount_isSeededIntoTheDatabaseAtStartup() {
        User owner = userRepository.findByUsername(SecurityConfigTest.TEST_USER).orElseThrow();

        assertThat(owner.getRole()).isEqualTo(Role.OWNER);
        assertThat(owner.getPersonName()).isEqualTo(SecurityConfigTest.TEST_PERSON_NAME);
        assertThat(owner.getCreatedAt()).isNotNull();
        assertThat(owner.isEnabled()).isTrue();
    }

    // -------------------------------------------------------------------------
    // Who is allowed in
    // -------------------------------------------------------------------------

    /* A logged-out visitor gets bounced to the login page, not to the accounts. */
    @Test
    void loggedOutVisitor_cannotReachAccountManagement() throws Exception {
        mockMvc.perform(get(ADMIN_URL))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }

    /*
     * A logged-in PLAYER is refused. This is the important one: being logged in
     * is not the same as being allowed. 403 means "I know who you are, and no".
     */
    @Test
    @WithMockUser(username = "someplayer", roles = "PLAYER")
    void player_cannotReachAccountManagement() throws Exception {
        mockMvc.perform(get(ADMIN_URL))
                .andExpect(status().isForbidden());
    }

    /* A logged-in PLAYER cannot create an account either. No self-signup, ever. */
    @Test
    @WithMockUser(username = "someplayer", roles = "PLAYER")
    void player_cannotCreateAnAccount() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("sneaky", "password123", "Sneaky Person"))))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void owner_canCreateAnAccount() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.username").value("ashketchum"))
                .andExpect(jsonPath("$.personName").value("Ash Ketchum"))
                .andExpect(jsonPath("$.role").value("PLAYER"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    /*
     * The single most important test in this story. The password must reach the
     * database as a BCrypt hash and nothing else.
     */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void createdAccount_storesAHashNotThePassword() throws Exception {
        String plainPassword = "pikachu2026";

        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", plainPassword, "Ash Ketchum"))))
                .andExpect(status().isCreated());

        User saved = userRepository.findByUsername("ashketchum").orElseThrow();

        // The real password is nowhere in the row.
        assertThat(saved.getPasswordHash()).isNotEqualTo(plainPassword);
        // What IS there is a BCrypt hash that the password matches.
        assertThat(passwordEncoder.matches(plainPassword, saved.getPasswordHash())).isTrue();
    }

    /* The response must never carry the hash back out to the browser. */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void responses_neverIncludeThePasswordHash() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    /* Two people cannot share a login name. */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void duplicateUsername_isRefused() throws Exception {
        String body = json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"));

        mockMvc.perform(post(ADMIN_URL).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post(ADMIN_URL).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());   // 409
    }

    /* The field checks work, so a bad form never reaches the database. */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void tooShortPassword_isRefused() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "short", "Ash Ketchum"))))
                .andExpect(status().isBadRequest());   // 400

        assertThat(userRepository.existsByUsername("ashketchum")).isFalse();
    }

    /*
     * NOTE - Phase 2 Story 5: the upper limit on a password, which was 100 and
     * is now 68.
     *
     * BCrypt hashes the first 72 bytes and ignores the rest, so anything longer
     * carries a tail that does nothing. Accepting it would mean two passwords
     * sharing their first 72 bytes opening the same account, while the form
     * claimed the whole thing mattered.
     *
     * 69 characters rather than something far longer, so the test fails if the
     * limit is moved by even one.
     */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void tooLongPassword_isRefused() throws Exception {
        String justOverTheLimit = "p".repeat(69);

        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", justOverTheLimit, "Ash Ketchum"))))
                .andExpect(status().isBadRequest());   // 400

        assertThat(userRepository.existsByUsername("ashketchum")).isFalse();
    }

    /* Person name is required, per the design decision. */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void missingPersonName_isRefused() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "   "))))
                .andExpect(status().isBadRequest());
    }

    /*
     * The whole point of the story: a person the DM invites can actually get in.
     * This goes through the real login form and the real database lookup.
     */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void aNewlyCreatedUser_canLogIn() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isCreated());

        mockMvc.perform(formLogin().user("ashketchum").password("pikachu2026"))
                .andExpect(authenticated());
    }

    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    /* The Manage Accounts table: the seeded owner, plus whoever was added. */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void owner_canListAccounts() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isCreated());

        mockMvc.perform(get(ADMIN_URL))
                .andExpect(status().isOk())
                // The list is newest first, so the account just added is at the top.
                .andExpect(jsonPath("$[0].username").value("ashketchum"))
                .andExpect(jsonPath("$[0].personName").value("Ash Ketchum"))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void owner_canFixAPersonName() throws Exception {
        User player = userRepository.save(
                new User("misty", passwordEncoder.encode("waterrules1"), "Mistt Waterflower", Role.PLAYER));

        mockMvc.perform(put(ADMIN_URL + "/" + player.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateUserRequest("Misty Waterflower"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.personName").value("Misty Waterflower"))
                // The username is untouched.
                .andExpect(jsonPath("$.username").value("misty"));
    }

    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void updatingAnAccountThatDoesNotExist_is404() throws Exception {
        mockMvc.perform(put(ADMIN_URL + "/999999")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateUserRequest("Nobody"))))
                .andExpect(status().isNotFound());
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void owner_canDeleteAPlayer() throws Exception {
        User player = userRepository.save(
                new User("brock", passwordEncoder.encode("rocksolid1"), "Brock Harrison", Role.PLAYER));

        mockMvc.perform(delete(ADMIN_URL + "/" + player.getId()).with(csrf()))
                .andExpect(status().isNoContent());   // 204

        assertThat(userRepository.existsByUsername("brock")).isFalse();
    }

    /* Guard one: you cannot delete yourself. */
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void owner_cannotDeleteThemselves() throws Exception {
        User owner = userRepository.findByUsername(SecurityConfigTest.TEST_USER).orElseThrow();

        mockMvc.perform(delete(ADMIN_URL + "/" + owner.getId()).with(csrf()))
                .andExpect(status().isConflict());

        assertThat(userRepository.existsByUsername(SecurityConfigTest.TEST_USER)).isTrue();
    }

    /*
     * Guard two: the last owner cannot be removed, so the platform can never be
     * left with nobody who can manage accounts. Here a SECOND owner tries to
     * delete the seeded one and is refused, because that would leave one owner
     * standing... which is fine. So this test checks the real failing case:
     * with only one owner in the table, deleting them is refused even by a
     * different owner account.
     */
    @Test
    @WithMockUser(username = "secondowner", roles = "OWNER")
    void theLastOwner_cannotBeDeleted() throws Exception {
        User onlyOwner = userRepository.findByUsername(SecurityConfigTest.TEST_USER).orElseThrow();

        mockMvc.perform(delete(ADMIN_URL + "/" + onlyOwner.getId()).with(csrf()))
                .andExpect(status().isConflict());

        assertThat(userRepository.existsByUsername(SecurityConfigTest.TEST_USER)).isTrue();
    }

    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void deletingAnAccountThatDoesNotExist_is404() throws Exception {
        mockMvc.perform(delete(ADMIN_URL + "/999999").with(csrf()))
                .andExpect(status().isNotFound());
    }
}