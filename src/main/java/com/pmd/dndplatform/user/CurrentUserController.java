package com.pmd.dndplatform.user;

import com.pmd.dndplatform.user.dto.SignedInAccount;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/*
 * Answers /api/me with the username, person name and role of the signed-in
 * account.
 */
@RestController
public class CurrentUserController {

    private final UserRepository userRepository;

    public CurrentUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Answers with the signed-in account.
     *
     * @param authentication (Authentication) the session's authentication, supplied by Spring.
     * @return (ResponseEntity<SignedInAccount>) 200 with the account.
     * @throws IllegalStateException if the signed-in account's row no longer exists.
     */
    @GetMapping("/api/me")
    public ResponseEntity<SignedInAccount> currentUser(Authentication authentication) {
        // A backstop, not dead code. The security rules stop a request with no session reaching here.
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String username = authentication.getName();

        // The person's name is not in the session, so it is read from the database.
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException(
                        "Signed-in account no longer exists: " + username));

        return ResponseEntity.ok(SignedInAccount.from(user));
    }
}