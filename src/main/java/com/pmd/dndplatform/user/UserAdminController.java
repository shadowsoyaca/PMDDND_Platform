package com.pmd.dndplatform.user;

import com.pmd.dndplatform.user.dto.CreateUserRequest;
import com.pmd.dndplatform.user.dto.UpdateUserRequest;
import com.pmd.dndplatform.user.dto.UserSummary;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/*
 * The non-public path the owner uses to manage accounts.
 *
 * Every address here starts with /api/admin/, and SecurityConfig requires the
 * OWNER role for everything under /api/admin/. A logged-out visitor is turned
 * away; a logged-in PLAYER gets 403 Forbidden. There is no signup route
 * anywhere in the app, so no one can make their own account.
 *
 * In Story 4 the DM's Manage Accounts screen calls exactly these four
 * addresses. Nothing here has to change when it does.
 */
@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    /* GET /api/admin/users  -> the Manage Accounts table. */
    @GetMapping
    public List<UserSummary> listUsers() {
        return userAdminService.listUsers();
    }

    /*
     * POST /api/admin/users  -> the Add User form.
     *
     * @Valid runs the checks on CreateUserRequest first. If any fail, this
     * method never runs and the caller gets 400.
     *
     * 201 CREATED is the correct answer for "a new thing now exists".
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummary createUser(@Valid @RequestBody CreateUserRequest request) {
        return userAdminService.createUser(request);
    }

    /* PUT /api/admin/users/{id}  -> fix a person name. */
    @PutMapping("/{id}")
    public UserSummary updateUser(@PathVariable Long id,
                                  @Valid @RequestBody UpdateUserRequest request) {
        return userAdminService.updatePersonName(id, request);
    }

    /*
     * DELETE /api/admin/users/{id}  -> remove an account.
     *
     * Spring fills in the Authentication argument with whoever is logged in, so
     * the service can refuse to let you delete yourself.
     *
     * 204 NO CONTENT is the correct answer for "done, and there is nothing to
     * send back".
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id, Authentication authentication) {
        userAdminService.deleteUser(id, authentication.getName());
    }
}