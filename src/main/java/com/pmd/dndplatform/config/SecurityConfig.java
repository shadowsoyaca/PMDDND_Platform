package com.pmd.dndplatform.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.context.DelegatingSecurityContextRepository;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.RequestAttributeSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;

/*
 * Phase 2 Story 2 built this. Phase 2 Story 3 changes two things:
 *
 *   1. The in-memory owner account is GONE. Accounts now come from the
 *      database, through DatabaseUserDetailsService. Spring Boot finds that
 *      class on its own because it is the only UserDetailsService in the app,
 *      and pairs it with the BCrypt encoder below.
 *
 *   2. Everything under /api/admin/ now requires the OWNER role, not merely a
 *      login. A logged-in PLAYER hitting an admin address gets 403 Forbidden.
 *
 * What did NOT change: default-deny on every route, BCrypt, no signup route,
 * the hardened session cookie, and the localhost-only /health rule.
 *
 * NOTE - Phase 2 Story 4 changes three things:
 *
 *   1. The React app's own files are now reachable without logging in. They
 *      have to be: the browser cannot draw the login screen without them.
 *      The list is deliberately narrow, see the comment on it below.
 *
 *   2. Form login now points at the React login screen instead of the plain
 *      grey page Spring draws for itself.
 *
 *   3. CSRF now uses the cookie-based token repository, which is what the
 *      PHASE 2 STORY 4 NOTE at the bottom of the Story 3 version asked for.
 *
 * Still unchanged: default-deny, BCrypt, no signup route, the OWNER rule on
 * /api/admin/, and the localhost-only /health rule.
 *
 * NOTE - Phase 2 Story 5.8: CsrfCookieFilter is gone. It used to be registered at
 * the bottom of the filter chain and was what made the CSRF cookie exist. That
 * job now belongs to one setter on the csrfTokenRequestHandler bean below, and
 * the comment on that bean explains the whole mechanism.
 */
@Configuration
public class SecurityConfig {

    /*
     * BCrypt turns a password into a one-way hash. The app only ever stores and
     * compares the hash, never the real password.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /*
     * NOTE - Phase 2 Story 5.5: five beans below, all of them here because
     * LoginController needs the same objects the filter chain uses.
     *
     * Before this story these were built inline where they were needed, which was
     * fine while only one thing used each. A controller now signs people in, and
     * it has to share them rather than make its own. Two CSRF token repositories
     * would write and check different cookies; two context repositories would save
     * a session the next request does not look in. Both faults are silent.
     */

    /*
     * Where the CSRF token is kept.
     *
     * Returns the cookie-based repository, readable by JavaScript.
     *
     * withHttpOnlyFalse is required and is not a weakening. The frontend has to
     * read this cookie to echo it back in a header, and that echo is the whole
     * mechanism: a hostile site can make the browser send a request, but
     * same-origin rules stop it reading this site's cookies, so it cannot supply a
     * matching token. JSESSIONID stays httpOnly and unreadable.
     */
    @Bean
    public CsrfTokenRepository csrfTokenRepository() {
        return CookieCsrfTokenRepository.withHttpOnlyFalse();
    }

    /*
     * How the token is put onto the request for other code to find.
     *
     * Returns the plain attribute handler with lazy token creation switched off.
     *
     * NOTE - Phase 2 Story 5.8: the setter in this method is what makes the CSRF
     * cookie exist. It looks like a line that does nothing. It is the opposite.
     *
     * WHAT THE DEFAULT DOES
     *
     * Out of the box the handler is lazy. It puts a supplier on the request, and
     * the token is only created, and the cookie only written, if something asks
     * for it. A React page never asks, so the cookie was never written and every
     * first attempt at anything was refused while the second worked. Phase 2
     * Story 5 answered that with CsrfCookieFilter, which asked on every request.
     * Phase 2 Story 5.5 then found a filter cannot cover a token replaced inside
     * a controller, which is exactly what signing in does, so LoginController had
     * to ask as well. Two places had to remember, and a third would have been
     * needed by the next story that replaced the token.
     *
     * WHAT A NULL NAME DOES
     *
     * The handler places the token on the request under a name. With the name
     * set to null it has to ask the token for its parameter name in order to
     * choose one, and that question is what resolves the token: load the cookie,
     * and if there is none, generate one and write it. Checked in the Spring
     * Security 6.5.11 bytecode rather than taken on trust. Nothing else changes:
     * the name it falls back to is "_csrf", which is the default anyway.
     *
     * The CSRF filter calls this handler on every request, so a browser arriving
     * without a cookie is given one. CsrfAuthenticationStrategy calls it again on
     * sign-in with the replacement token, so the fresh cookie is written inside
     * the controller with nothing further having to remember to ask.
     *
     * HOW IT WAS PROVEN
     *
     * Before this line was committed: with the filter and the controller's asking
     * line deleted and this setter absent, CsrfCookieTest fails on the login
     * screen writing no cookie. With the setter present it passes, unedited. That
     * test is the guard on this line. Delete the line and the two-attempt fault
     * comes back with nothing logged, and the test is what will say so.
     */
    @Bean
    public CsrfTokenRequestHandler csrfTokenRequestHandler() {
        CsrfTokenRequestAttributeHandler handler = new CsrfTokenRequestAttributeHandler();
        handler.setCsrfRequestAttributeName(null);
        return handler;
    }

    /*
     * Where a signed-in session is stored and read back.
     *
     * Returns the same pairing Spring Security uses by default: the request
     * attribute copy for the rest of the current request, and the HTTP session for
     * every request after it.
     *
     * It is declared here rather than left to the default so LoginController can be
     * handed the identical object. The chain is told to use this one below. If the
     * two ever differed, signing in would answer 200 and the next request would
     * find nobody signed in, with nothing logged anywhere.
     */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new DelegatingSecurityContextRepository(
                new RequestAttributeSecurityContextRepository(),
                new HttpSessionSecurityContextRepository());
    }

    /*
     * What must happen at the moment somebody authenticates.
     *
     * csrfTokenRepository - where the replacement token is written.
     * csrfTokenRequestHandler - how that token is put onto the request.
     *
     * Returns the two strategies Spring's own login filter would have run.
     *
     * WHY THIS EXISTS AT ALL
     *
     * Until Phase 2 Story 5.5 the form login filter did both of these without
     * anyone configuring them. That filter is gone, and a controller inherits
     * nothing, so they are named here and handed to LoginController.
     *
     *   ChangeSessionIdAuthenticationStrategy issues a new session id, so an id the
     *   browser was already carrying cannot be ridden in on. If no session exists
     *   yet it does nothing, which is correct.
     *
     *   CsrfAuthenticationStrategy throws the old token away and writes a new one,
     *   so a token picked up before signing in cannot be used afterwards.
     *
     * Both are Spring's classes rather than equivalents written here, because there
     * is no version of this worth writing twice.
     */
    @Bean
    public SessionAuthenticationStrategy sessionAuthenticationStrategy(
            CsrfTokenRepository csrfTokenRepository,
            CsrfTokenRequestHandler csrfTokenRequestHandler) {

        CsrfAuthenticationStrategy csrfStrategy =
                new CsrfAuthenticationStrategy(csrfTokenRepository);
        csrfStrategy.setRequestHandler(csrfTokenRequestHandler);

        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                csrfStrategy));
    }

    /*
     * The thing that checks a username and password.
     *
     * configuration - Spring Security's own assembly of it.
     *
     * Returns the manager already built from DatabaseUserDetailsService and the
     * BCrypt encoder above.
     *
     * Raises Exception because that is what getAuthenticationManager declares.
     *
     * This existed before and was not reachable, because only Spring's own filters
     * used it. LoginController calls it directly, so it has to be a bean.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            CsrfTokenRepository csrfTokenRepository,
            CsrfTokenRequestHandler csrfTokenRequestHandler,
            SecurityContextRepository securityContextRepository) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                /*
                 * /health is allowed only when the request comes from this
                 * machine itself (address 127.0.0.1 or its IPv6 form ::1). The
                 * deploy script checks /health locally on the server, so it
                 * still works. Requests from outside come in through Caddy
                 * carrying the visitor address, so they fail this check and
                 * get bounced to the login page.
                 */
                .requestMatchers("/health").access(
                    new WebExpressionAuthorizationManager(
                        "hasIpAddress('127.0.0.1') or hasIpAddress('::1')"))

                /*
                 * NOTE - Phase 2 Story 4: the React app's own files.
                 *
                 * A logged-out visitor must be able to fetch these, because the
                 * browser cannot draw the login screen without them. Everything
                 * here is public code and public artwork; nothing in this list
                 * reveals anything about the game or its players.
                 *
                 *   /            - the app's entry page
                 *   /index.html  - the same page by its real filename
                 *   /assets/**   - everything Vite bundles: JavaScript, CSS, and
                 *                  any image imported from TypeScript. Filenames
                 *                  carry a content hash, so this path holds only
                 *                  build output and never anything hand-placed.
                 *   /favicon.svg - the browser asks for this on its own
                 *   /vite.svg    - shipped by the Vite starter template
                 *
                 * STANDING RULE (Phase 2 Story 4): put static assets in
                 * frontend/src/assets/ and import them in TypeScript. Vite then
                 * fingerprints them into /assets/, which this list already
                 * covers, so no new line is needed here. Two further benefits:
                 * a hashed filename can be cached by the browser forever and
                 * still update instantly when the file changes, and a mistyped
                 * import fails the build instead of 404-ing in front of a player.
                 *
                 * Only use frontend/public/ when a file must keep an exact name
                 * at an exact path, such as favicon.svg or robots.txt. Every
                 * file placed there sits at the root and needs its own line
                 * added below, or it will be redirected to the login page.
                 */
                .requestMatchers("/", "/index.html", "/assets/**",
                                 "/favicon.svg").permitAll()

                // The login page is the only thing a logged-out visitor can reach.
                .requestMatchers("/login").permitAll()

                /*
                 * NOTE - Phase 2 Story 5.5: the sign-in endpoint.
                 *
                 * It must be reachable without being signed in, which is the whole
                 * point of it. That is not the same as unprotected: the CSRF filter
                 * still demands a token, and LoginController answers 401 to any
                 * credentials it does not accept.
                 *
                 * It sits under /api/ because it answers with data. /login is a
                 * screen inside the React app, forwarded to index.html by WebConfig,
                 * and one address should not be both a screen and an endpoint.
                 */
                .requestMatchers("/api/login").permitAll()

                /*
                 * Account management. Being logged in is not enough - you must
                 * be the owner. hasRole("OWNER") looks for the authority
                 * "ROLE_OWNER", which is what DatabaseUserDetailsService builds
                 * from Role.OWNER. The two agree because Spring adds the same
                 * "ROLE_" prefix on both sides.
                 *
                 * A future assistant-DM role would get its own line here, with
                 * whatever addresses it is allowed to reach. This one line is
                 * the whole reason a third role is cheap to add later.
                 */
                .requestMatchers("/api/admin/**").hasRole("OWNER")

                // Everything else needs a logged-in session.
                .anyRequest().authenticated()
            )
            /*
             * NOTE - Phase 2 Story 5.5: formLogin is GONE. This is the story that
             * the Story 4 note here said would remove it.
             *
             * It used to name /login as the login page and /login?error as where a
             * refusal was sent. Both were redirects, which is the fault: a redirect
             * carries no information the login screen can read, so a wrong password
             * and an unreachable server arrived looking identical. LoginController
             * answers /api/login with data instead.
             *
             * TWO THINGS CAME FREE WITH formLogin AND HAD TO BE REPLACED.
             *
             * Naming a loginPage also set the entry point bounces a logged out
             * visitor to the login screen. Deleting formLogin without setting
             * it explicitly would answer 403 to every logged-out request 
             * instead of showing the login screen.
             *
             * The second is in LoginController: replacing the session id and the
             * CSRF token on sign-in, which that filter did on its own.
             *
             * logout() is untouched. It still answers a redirect, and the sign out
             * button still expects one. Moving it to /api/logout for symmetry was
             * considered and left alone, because this story did not ask for it.
             */
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            )
            /*
             * NOTE - Phase 2 Story 4: CSRF stays ON, but the token now travels
             * in a cookie. This is the change the Story 3 version flagged.
             *
             * What CSRF protection stops: another website quietly making your
             * browser send a request here while you are logged in. Without it, a
             * page you visit could fire a DELETE at /api/admin/users/5 using
             * your session.
             *
             * The cost: any state-changing request (POST, PUT, DELETE) must
             * carry a CSRF token. Spring's own login page could read the token
             * straight out of the HTML it drew. React cannot, because the page
             * is built in the browser after the HTML arrives. The cookie
             * repository solves this by also writing the token to a cookie named
             * XSRF-TOKEN, which the frontend reads and sends back on each
             * state-changing request.
             *
             * withHttpOnlyFalse is required and is not a weakening of the
             * protection. The cookie must be readable by JavaScript for the
             * frontend to echo it back, and that echo is the entire mechanism: a
             * hostile site can cause a request to be sent, but the browser's
             * same-origin rules stop it reading this site's cookies, so it
             * cannot supply a matching token. The session cookie itself,
             * JSESSIONID, stays httpOnly and unreadable.
             *
             * NOTE - Phase 2 Story 5: this block alone is NOT enough, and the
             * paragraph above overstates what it does. The token described here
             * is only created when something asks for it, and nothing did, so no
             * cookie was ever written.
             *
             * NOTE - Phase 2 Story 5.8: Story 5 answered that with a filter that
             * asked on every request, registered at the bottom of this method. It
             * is gone. The handler bean above has lazy creation switched off, and
             * the comment on it explains the whole mechanism.
             */
            /*
             * NOTE - Phase 2 Story 5.5: these are the beans declared above rather
             * than objects made here, so LoginController is handed the same pair.
             * Two repositories would write one cookie and check another.
             */
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository)
                .csrfTokenRequestHandler(csrfTokenRequestHandler)
            )
            /*
             * NOTE - Phase 2 Story 5.5: the chain is told which context repository
             * to use, so it is provably the same object LoginController saves a
             * signed-in session to. This is Spring's own default pairing, named
             * explicitly rather than left to be assumed, because "the default on
             * both sides" stops being true the moment somebody changes one side.
             */
            .securityContext(securityContext -> securityContext
                .securityContextRepository(securityContextRepository)
            )
            /*
             * NOTE - Phase 2 Story 5: refusals now say which kind they are.
             *
             * Being refused for lacking permission and being refused over a CSRF
             * token both arrive as 403, and they need opposite responses from the
             * person: one is permanent and one clears on a page reload. The
             * handler writes a one-word reason so the screens can tell them apart
             * instead of guessing, which they did, wrongly.
             *
             * This affects only callers who ARE signed in. A request with no
             * session is caught before this by the entry point and bounced to the
             * login screen, which is unchanged.
             */
            .exceptionHandling(handling -> handling
                /*
                 * NOTE - Phase 2 Story 5.5: this used to come free with formLogin's
                 * loginPage setting, and had to be named once formLogin was
                 * deleted. It is what sends a logged-out visitor to the login
                 * screen rather than answering them 403.
                 *
                 * It also keeps /api/me answering a logged-out request with a
                 * redirect to an HTML page, which lib/currentUser.ts depends on. It
                 * checks the content type rather than the status, because fetch
                 * follows that redirect on its own and hands back the login page's
                 * HTML carrying a status of 200. LIVING_DOC.md records the two bugs
                 * that behaviour caused.
                 */
                .authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/login"))
                .accessDeniedHandler(new DeniedReasonHandler())
            );

        return http.build();
    }
}