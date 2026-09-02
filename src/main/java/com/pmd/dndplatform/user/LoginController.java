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
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/*
 * Phase 2 Story 5.5: signing in, with an answer the screen can actually read.
 *
 * WHAT THIS REPLACES
 *
 * Spring Security's form login, configured in SecurityConfig since Phase 2 Story
 * 4 and deleted by this story. That answered every attempt with a redirect,
 * whether it worked or not, so the login screen could not tell a wrong password
 * from a server it could not reach and had to show one message covering both. It
 * also had to ask /api/me straight afterwards simply to find out whether the
 * sign-in had happened.
 *
 * This answers three different ways instead:
 *
 *   200  signed in, and here is the account.
 *   401  refused. Wrong username, wrong password, or a disabled account, all
 *        identical from outside.
 *   403  the CSRF token was missing or wrong. Not written here. The CSRF filter
 *        refuses the request before this class is reached, and DeniedReasonHandler
 *        writes the answer.
 *
 * WHY THE THREE CALLS IN THE MIDDLE OF THIS METHOD ARE NOT OPTIONAL
 *
 * This is the cost of using a controller instead of a filter, and it is the part
 * worth reading carefully. Spring's login filter did three things automatically.
 * A controller does none of them, and forgetting any one leaves an application
 * that still signs people in, still passes every other test, and is wrong.
 *
 *   1. Replace the session id, so a session id the browser already held cannot be
 *      used to ride in on the sign-in. Forgetting it leaves session fixation open.
 *   2. Replace the CSRF token, so one obtained before signing in cannot be reused
 *      afterwards.
 *   3. Save the security context to the session. Since Spring Security 6 this is
 *      NOT automatic. Forgetting it means the sign-in answers 200, looks entirely
 *      successful, and the very next request finds no session at all.
 *
 * The first two are done by handing the authentication to the strategy Spring
 * uses for the same purpose, rather than by writing equivalents here. Both are
 * pinned by CsrfCookieTest and the third by JsonLoginTest, and all three were
 * written before this class existed.
 */
@RestController
public class LoginController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    /*
     * All four come from SecurityConfig, and three of them are shared with the
     * filter chain on purpose. The context repository in particular must be the
     * same object the chain reads from, or this method would save a session the
     * next request does not look in.
     */
    public LoginController(AuthenticationManager authenticationManager,
                           UserRepository userRepository,
                           SecurityContextRepository securityContextRepository,
                           SessionAuthenticationStrategy sessionAuthenticationStrategy) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
    }

    /*
     * Signs somebody in.
     *
     * request      - the username and password, as JSON.
     * httpRequest  - needed because the session lives on it, not on the record.
     * httpResponse - needed because the new session and token cookies are written
     *                to it.
     *
     * Returns 200 with the account, or 401 with a one-word reason.
     *
     * Raises IllegalStateException only if the account authenticated and then
     * could not be found, which would mean it was deleted between those two lines.
     * That is a real fault rather than something to paper over.
     *
     * WHY EVERY REFUSAL LOOKS THE SAME
     *
     * AuthenticationException is the parent of all of them: no such username, wrong
     * password, disabled account, locked account. They are caught together and
     * answered identically, deliberately. Saying which one happened would tell
     * whoever is asking which usernames exist on this server, and that is worth
     * more to them than it is to the person who mistyped something.
     *
     * The message shown to the person is written by the frontend. Nothing from the
     * exception is sent back, for the same reason DeniedReasonHandler sends two
     * fixed words rather than the exception text.
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

        /*
         * Jobs 1 and 2, in one call. The strategy is composed in SecurityConfig out
         * of Spring's own ChangeSessionIdAuthenticationStrategy and
         * CsrfAuthenticationStrategy, so this is Spring's code doing the work
         * rather than an imitation of it written here.
         *
         * It must run before the context is saved below. Changing the session id
         * after saving would leave the saved context on the old session.
         *
         * If no session exists yet, the session part does nothing and returns, which
         * is correct: there is no id to replace. The token part still runs.
         */
        sessionAuthenticationStrategy.onAuthentication(authentication, httpRequest, httpResponse);

        /*
         * And this line is what makes job 2 actually happen. It looks deletable and
         * it is not, in the same way and for the same reason as the line inside
         * CsrfCookieFilter.
         *
         * CsrfAuthenticationStrategy deletes the old token cookie and then DEFERS
         * the new one, writing it only if something asks. CsrfCookieFilter is the
         * thing that normally asks, and it has already run by the time a controller
         * is reached, because filters run first. So without this line the sign-in
         * answer deletes the token and puts nothing in its place, and the browser is
         * left holding an empty cookie.
         *
         * That was measured, not guessed. On the first run of CsrfCookieTest against
         * this controller the sign-in answer carried XSRF-TOKEN with an empty value,
         * and the next request was refused with 403. It is exactly the fault Phase 2
         * Story 5 fixed, reappearing somewhere new, and it is just as quiet: signing
         * in works, and the first thing done afterwards fails.
         *
         * The value is deliberately not used. Asking for it is the whole point.
         */
        if (httpRequest.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken freshToken) {
            freshToken.getToken();
        }

        /*
         * Job 3. createEmptyContext rather than reading the current one, because
         * the current one belongs to the request that arrived unauthenticated and
         * reusing it is how a context ends up shared between threads.
         *
         * Setting it on the holder covers anything later in THIS request that asks
         * who is signed in. Saving it to the repository is what makes the NEXT
         * request find it. Both are needed and they are not the same thing.
         */
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        /*
         * The person's real name is not carried in the authentication, only the
         * username, so it is read from the database. orElseThrow is safe: the
         * account was found a few lines ago, during authentication.
         */
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new IllegalStateException(
                        "Signed-in account no longer exists: " + authentication.getName()));

        return ResponseEntity.ok(SignedInAccount.from(user));
    }
}
