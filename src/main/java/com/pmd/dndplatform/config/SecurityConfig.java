package com.pmd.dndplatform.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;

/*
 * Story 2: Secure Every Route with Spring Security.
 *
 * This one class does four things:
 *   1. Sets BCrypt as the password hashing method.
 *   2. Defines the single temporary owner account (held in memory only).
 *   3. Locks every route so it needs a login, with two exceptions:
 *      the login page, and /health when it is asked for from this machine.
 *   4. Turns on the built-in login form.
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
     * The one temporary owner account (you). It lives in memory only while the
     * app is running. The username and the already-hashed password are read
     * from environment variables, so no secret is written into the code.
     *
     * This whole account is removed in Story 3, when real accounts start coming
     * from the database instead.
     */
    @Bean
    public UserDetailsService userDetailsService(
            @Value("${app.owner.username}") String username,
            @Value("${app.owner.password-hash}") String passwordHash) {

        UserDetails owner = User.withUsername(username)
                .password(passwordHash)   // this is already a BCrypt hash, not a plain password
                .roles("OWNER")
                .build();

        return new InMemoryUserDetailsManager(owner);
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
                 *
                 * This depends on the forwarded-headers setting from Story 1,
                 * which lets the app see the real visitor address. It is kept
                 * deliberately light because /health returns only a short
                 * "up and running" message. If it ever needs to be fully sealed,
                 * block it at Caddy instead.
                 */
                .requestMatchers("/health").access(
                    new WebExpressionAuthorizationManager(
                        "hasIpAddress('127.0.0.1') or hasIpAddress('::1')"))
                // The login page is the only other thing a logged-out visitor can reach.
                .requestMatchers("/login").permitAll()
                // Everything else needs a logged-in session.
                .anyRequest().authenticated()
            )
            /*
             * Built-in login form for now (Spring draws a plain default page).
             * The React login screen replaces the look in Story 4. The login
             * mechanism underneath stays the same.
             */
            .formLogin(Customizer.withDefaults());

        return http.build();
    }
}