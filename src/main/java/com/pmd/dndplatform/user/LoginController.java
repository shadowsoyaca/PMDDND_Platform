package com.pmd.dndplatform.user;

import com.pmd.dndplatform.user.dto.LoginRequest;
import com.pmd.dndplatform.user.dto.SignedInAccount;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/*
 * The sign-in endpoint. Checks a username and password, starts the session,
 * and answers with the account or a refusal.
 */
@RestController
public class LoginController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    // All four arguments are SecurityConfig's beans.
    public LoginController(AuthenticationManager authenticationManager,
                           UserRepository userRepository,
                           SecurityContextRepository securityContextRepository,
                           SessionAuthenticationStrategy sessionAuthenticationStrategy) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
    }

    /**
     * Signs somebody in. Every kind of refused credential is answered identically.
     *
     * @param request (LoginRequest) the username and password, as JSON.
     * @param httpRequest (HttpServletRequest) the request the session lives on.
     * @param httpResponse (HttpServletResponse) where the new session and token cookies are written.
     * @return (ResponseEntity<Object>) 200 with the account, or 401 with a one-word reason.
     * @throws IllegalStateException if the account authenticated and then could not be found.
     */
    @PostMapping("/api/login")
    public ResponseEntity<Object> login(@RequestBody LoginRequest request,
                                        HttpServletRequest httpRequest,
                                        HttpServletResponse httpResponse) {

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.username(), request.password()));
        } catch (AuthenticationException refused) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("reason", "bad-credentials"));
        }

        // Replaces the session id and the CSRF token. Runs before the context is saved below.
        sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);

        // Setting the holder covers the rest of this request. Saving to the
        // repository is a separate job and is what the next request finds.
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        // The person's name is not in the authentication, so it is read from the database.
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException(
                        "Signed-in account no longer exists: " + authentication.getName()));

        return ResponseEntity.ok(SignedInAccount.from(user));
    }
}
