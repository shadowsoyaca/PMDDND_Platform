package com.pmd.dndplatform.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;

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
             * Built-in login form for now (Spring draws a plain default page).
             * The React login screen replaces the look in Story 4. The login
             * mechanism underneath stays the same - it just reads from the
             * database now instead of from memory.
             */
            .formLogin(Customizer.withDefaults());

        /*
         * CSRF protection is left ON (it is on by default).
         *
         * What it stops: another website quietly making your browser send a
         * request here while you are logged in. Without it, a page you visit
         * could fire a DELETE at /api/admin/users/5 using your session.
         *
         * The cost: any state-changing request (POST, PUT, DELETE) must carry a
         * CSRF token. The tests below use a helper for this. 
         * PHASE 2 STORY 4 NOTE: 
         * the React frontend must send the token too, which usually means switching
         * to the cookie-based token repository so the browser can read it. That
         * is a Story 4 change, made once, when there is a frontend to test it
         * against.
         */

        return http.build();
    }
}