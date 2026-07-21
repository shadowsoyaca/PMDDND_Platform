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
 * The rules for managing accounts. All of them live here, not in the controller.
 *
 * The controller's job is only to receive the web request and hand back a
 * response. This class decides what is and is not allowed. Keeping them apart
 * means the rules can be tested and reused (the Story 4 screen, a future
 * command-line tool) without dragging the web layer along.
 */
@Service
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAdminService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /* The Manage Accounts table. Newest account first. Never includes the hash. */
    @Transactional(readOnly = true)
    public List<UserSummary> listUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(UserSummary::from)
                .toList();
    }

    /*
     * Create an account. Every account made here is a PLAYER.
     *
     * The plain password exists only inside this method, only long enough to be
     * hashed. It is never stored, never logged, and never sent back out.
     */
    @Transactional
    public UserSummary createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            // 409 CONFLICT is the honest answer: the request was well-formed,
            // it just collides with something that already exists.
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

    /* Change the person name. Nothing else on the account is touched. */
    @Transactional
    public UserSummary updatePersonName(Long id, UpdateUserRequest request) {
        User user = findOr404(id);
        user.setPersonName(request.personName());
        // No save() call is needed. Inside a transaction, Hibernate notices the
        // change to a loaded row and writes it out at the end by itself.
        return UserSummary.from(user);
    }

    /*
     * Delete an account, with two guards:
     *   1. You cannot delete yourself. This is the obvious foot-gun.
     *   2. You cannot delete the last owner. Even if a second owner exists one
     *      day and deletes you, the platform is never left with no one who can
     *      manage accounts.
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

    private User findOr404(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No account with id " + id + "."));
    }
}
