package com.pmd.dndplatform.user;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/*
 * Phase 2 Story 4: answers the question "who am I signed in as?".
 *
 * WHY THIS EXISTS
 *
 * Spring's built-in form login answers every sign-in attempt with a redirect,
 * whether it worked or not. A browser following that redirect ends up in the
 * right place either way, but a React screen sending the request itself cannot
 * tell the two apart from the answer alone.
 *
 * So the login screen asks a second question. This address answers 200 with the
 * account's details when there is a session, and is redirected to the login
 * screen by the default-deny rule when there is not. That difference is
 * unambiguous, so the screen knows whether to go on or show an error.
 *
 * The placeholder home page uses the same address to show who is signed in, and
 * every later screen can use it to decide what a player is allowed to see.
 *
 * WHY THE ROLE IS INCLUDED
 *
 * Not for security. Anything the browser is told can be edited by whoever is
 * holding it, so the role here is for appearance only: deciding which landing
 * page to show, and which menu items to draw. Every rule that actually matters
 * is enforced on this side, by SecurityConfig and by the OWNER check on
 * /api/admin/. A player who edits this value in their browser sees a menu they
 * cannot use.
 *
 * WHY NOT THE WHOLE USER RECORD
 *
 * This deliberately returns three fields rather than the User object. Returning
 * the entity would hand out the password hash and the account's internal id,
 * neither of which the browser has any use for. Naming the fields one by one
 * means a column added to the table later cannot leak by accident.
 *
 * DEFERRED to Phase 2 Story 5.5: once sign-in has an endpoint that answers with
 * data instead of a redirect, the login screen will not need to call this
 * straight after signing in. This address stays useful on its own, though, for
 * any screen that needs to know who is looking at it.
 */
@RestController
public class CurrentUserController {

    private final UserRepository userRepository;

    public CurrentUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/api/me")
    public ResponseEntity<Map<String, String>> currentUser(Authentication authentication) {
        /*
         * Reaching this method at all means SecurityConfig already accepted the
         * request, so there is a session. This check is a backstop rather than a
         * real branch: it keeps the method honest if the security rules are ever
         * changed above it.
         */
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String username = authentication.getName();

        /*
         * The person's real name is not carried in the session, only the
         * username, so it is read from the database. orElseThrow is safe here:
         * the session exists because this account was found at sign-in, so a
         * missing row would mean the account was deleted mid-session, which is
         * a genuine error rather than something to paper over.
         */
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException(
                        "Signed-in account no longer exists: " + username));

        return ResponseEntity.ok(Map.of(
                "username", user.getUsername(),
                "personName", user.getPersonName(),
                "role", user.getRole().name()
        ));
    }
}