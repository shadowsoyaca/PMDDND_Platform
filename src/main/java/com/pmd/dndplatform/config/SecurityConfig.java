package com.pmd.dndplatform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;

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

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                /*
                 * /health is allowed only when the request comes from this
                 * machine itself (address 127.0.0.1 or its IPv6 form ::1). The
                 * deploy script checks /health locally on the server, so it
                 * still works. Requests from outside come in through Caddy
                 * carrying the real visitor address, so they fail this check and
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
                 *
                 * The list is kept narrow on purpose. A broad rule such as
                 * "permit anything that is not /api/" would never need
                 * maintaining, but it would invert this file's default: new
                 * routes would become public unless someone remembered to
                 * protect them. Default-deny is worth the occasional new line.
                 */
                .requestMatchers("/", "/index.html", "/assets/**",
                                 "/favicon.svg").permitAll()

                // The login page is the only thing a logged-out visitor can reach.
                .requestMatchers("/login").permitAll()

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
             * NOTE - Phase 2 Story 4: form login now points at the React screen.
             *
             * Naming a loginPage stops Spring drawing its own plain grey page
             * and makes it serve whatever answers at that address instead. The
             * React app answers there, by way of the forwarding rule in
             * WebConfig - /login is a screen inside the React app, not a file on
             * disk, so without that rule this address would 404.
             *
             * How the sign-in itself works has NOT changed. The React form posts
             * the same two fields, username and password, to the same address,
             * exactly as Spring's own page did. Only the appearance is new.
             *
             * DEFERRED to Phase 2 Story 5.5: replacing this with an endpoint
             * that speaks JSON. Form login answers with a redirect rather than
             * data, so the frontend cannot tell a wrong password apart from an
             * unreachable server, and the error message shown to a player has to
             * stay vague as a result.
             *
             * failureUrl carries ?error so the React screen knows to show its
             * error message. logout() gives Story 4 its logout button; ?logout
             * lets the screen say goodbye rather than looking like a failure.
             */
            .formLogin(form -> form
                .loginPage("/login")
                .failureUrl("/login?error")
                .permitAll()
            )
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
             * cookie was ever written. See CsrfCookieFilter at the bottom of this
             * method, which is what makes any of the above true in practice.
             */
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
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
                .accessDeniedHandler(new DeniedReasonHandler())
            )
            /*
             * NOTE - Phase 2 Story 5: this is what makes the CSRF cookie exist.
             *
             * Without it the token is created only when something asks for it,
             * and a React page never asks. The measured result was that every
             * first attempt failed and every second attempt worked: signing in
             * took two tries, signing out took two tries, and so did creating an
             * account. CsrfCookieFilter explains the whole mechanism.
             *
             * Placed after BasicAuthenticationFilter so it runs late enough to
             * see the token Spring Security put on the request, and, more
             * importantly, late enough on a sign-in to write the NEW token that
             * replaces the one authentication throws away.
             */
            .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class);

        return http.build();
    }
}