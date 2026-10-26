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
 * The endpoints the owner uses to manage accounts. Everything here sits under
 * /api/admin/, which SecurityConfig restricts to the OWNER role.
 */
@RestController
@RequestMapping("/api/admin/users")
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    /*
     * Lists every account.
     *
     * @return (List<UserSummary>) all accounts, newest first.
     */
    @GetMapping
    public List<UserSummary> listUsers() {
        return userAdminService.listUsers();
    }

    /*
     * Creates a player account and answers 201.
     *
     * @param request (CreateUserRequest) the new account's details, validated before this runs.
     * @return (UserSummary) the account that was created.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummary createUser(@Valid @RequestBody CreateUserRequest request) {
        return userAdminService.createUser(request);
    }

    /*
     * Changes the person name on an account.
     *
     * @param id (Long) the account to change.
     * @param request (UpdateUserRequest) the new person name.
     * @return (UserSummary) the account after the change.
     */
    @PutMapping("/{id}")
    public UserSummary updateUser(@PathVariable Long id,
                                  @Valid @RequestBody UpdateUserRequest request) {
        return userAdminService.updatePersonName(id, request);
    }

    /*
     * Deletes an account and answers 204.
     *
     * @param id (Long) the account to delete.
     * @param authentication (Authentication) the caller's identity, used by the self-delete guard.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id, Authentication authentication) {
        userAdminService.deleteUser(id, authentication.getName());
    }
}