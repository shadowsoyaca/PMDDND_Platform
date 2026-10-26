package com.pmd.dndplatform.user;

import com.pmd.dndplatform.user.dto.CreateUserRequest;
import com.pmd.dndplatform.user.dto.UpdateUserRequest;
import com.pmd.dndplatform.user.dto.UserSummary;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/*
 * The rules for managing accounts: listing, creating, renaming and deleting
 * them. A refused request is thrown as a ResponseStatusException.
 */
@Service
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAdminService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /*
     * Lists every account, newest first.
     *
     * @return (List<UserSummary>) all accounts without their hashes.
     */
    @Transactional(readOnly = true)
    public List<UserSummary> listUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(UserSummary::from)
                .toList();
    }

    /*
     * Creates a PLAYER account, storing the password as a BCrypt hash.
     *
     * @param request (CreateUserRequest) the username, password and person name.
     * @return (UserSummary) the saved account.
     * @throws ResponseStatusException with 409 when the username is already taken.
     */
    @Transactional
    public UserSummary createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "That username is already taken.");
        }

        String hash = passwordEncoder.encode(request.password());

        User user = new User(
                request.username(),
                hash,
                request.personName(),
                Role.PLAYER
        );

        return UserSummary.from(userRepository.save(user));
    }

    /*
     * Changes the person name on an account. Nothing else is touched.
     *
     * @param id (Long) the account to change.
     * @param request (UpdateUserRequest) the new person name.
     * @return (UserSummary) the account after the change.
     * @throws ResponseStatusException with 404 when no account has that id.
     */
    @Transactional
    public UserSummary updatePersonName(Long id, UpdateUserRequest request) {
        User user = findOr404(id);
        user.setPersonName(request.personName());
        // @Transactional is what writes this change. There is no save call.
        return UserSummary.from(user);
    }

    /*
     * Deletes an account. Refuses the caller's own account and the last OWNER account.
     *
     * @param id (Long) the account to delete.
     * @param requestingUsername (String) the username of the caller.
     * @throws ResponseStatusException with 404 when no account has that id,
     *         or with 409 when either guard refuses the delete.
     */
    @Transactional
    public void deleteUser(Long id, String requestingUsername) {
        User target = findOr404(id);

        if (target.getUsername().equals(requestingUsername)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You cannot delete your own account.");
        }

        if (target.getRole() == Role.OWNER && userRepository.findByRole(Role.OWNER).size() <= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You cannot delete the last owner account.");
        }

        userRepository.delete(target);
    }

    /*
     * Loads an account by id.
     *
     * @param id (Long) the account to load.
     * @return (User) the loaded entity.
     * @throws ResponseStatusException with 404 when no account has that id.
     */
    private User findOr404(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No account with id " + id + "."));
    }
}
