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
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/*
 * Tests for the account management endpoints. @Transactional rolls back what
 * each test writes, and .with(csrf()) supplies the CSRF token on every POST,
 * PUT and DELETE.
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

    /*
     * Turns a request object into its JSON body.
     *
     * @param body (Object) the request object to serialise.
     * @return (String) the JSON body.
     * @throws Exception when the object cannot be serialised.
     */
    private String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    // -------------------------------------------------------------------------
    // The owner seed
    // -------------------------------------------------------------------------

    // Checks the owner row is planted at startup.
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

    // Checks a logged-out visitor is redirected to the login page.
    @Test
    void loggedOutVisitor_cannotReachAccountManagement() throws Exception {
        mockMvc.perform(get(ADMIN_URL))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("**/login"));
    }

    // Checks a logged-in PLAYER gets 403.
    @Test
    @WithMockUser(username = "someplayer", roles = "PLAYER")
    void player_cannotReachAccountManagement() throws Exception {
        mockMvc.perform(get(ADMIN_URL))
                .andExpect(status().isForbidden());
    }

    // Checks a logged-in PLAYER cannot create an account.
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

    // Checks the password reaches the database as a BCrypt hash.
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

        // The stored value is not the plain password.
        assertThat(saved.getPasswordHash()).isNotEqualTo(plainPassword);
        // The stored value is a hash the password matches.
        assertThat(passwordEncoder.matches(plainPassword, saved.getPasswordHash())).isTrue();
    }

    // Checks the response body carries no hash or password.
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

    // Checks a second account with the same username answers 409.
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

    // Checks a too-short password is refused and nothing is saved.
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

    // Checks a 69 character password, one over the limit, is refused.
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

    // Checks a username with a space is refused.
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void usernameWithASpace_isRefused() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ash ketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isBadRequest());   // 400

        assertThat(userRepository.existsByUsername("ash ketchum")).isFalse();
    }

    // Checks a dash and an underscore are accepted in a username.
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void usernameWithADashAndUnderscore_isAccepted() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ash_ketchum-2", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isCreated());
    }

    // Checks a blank person name is refused.
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void missingPersonName_isRefused() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "   "))))
                .andExpect(status().isBadRequest());
    }

    // Checks a newly created account can sign in through the login endpoint.
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void aNewlyCreatedUser_canLogIn() throws Exception {
        mockMvc.perform(post(ADMIN_URL)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CreateUserRequest("ashketchum", "pikachu2026", "Ash Ketchum"))))
                .andExpect(status().isCreated());

        // Checks the response body names the new account. The mock user
        // from @WithMockUser cannot produce that body.
        mockMvc.perform(post("/api/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"ashketchum\",\"password\":\"pikachu2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("ashketchum"))
                .andExpect(jsonPath("$.personName").value("Ash Ketchum"))
                .andExpect(jsonPath("$.role").value("PLAYER"));
    }

    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    // Checks the list holds the seeded owner and the added account, newest first.
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
                // The account just added is at the top.
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

    // Checks an owner cannot delete their own account.
    @Test
    @WithMockUser(username = SecurityConfigTest.TEST_USER, roles = "OWNER")
    void owner_cannotDeleteThemselves() throws Exception {
        User owner = userRepository.findByUsername(SecurityConfigTest.TEST_USER).orElseThrow();

        mockMvc.perform(delete(ADMIN_URL + "/" + owner.getId()).with(csrf()))
                .andExpect(status().isConflict());

        assertThat(userRepository.existsByUsername(SecurityConfigTest.TEST_USER)).isTrue();
    }

    // Checks the only OWNER row cannot be deleted by a different owner.
    // The second-owner test user has no database row on purpose.
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