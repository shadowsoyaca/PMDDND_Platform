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
 * Spring Security setup: which routes need a session or the OWNER role, how
 * passwords are hashed, and the CSRF and session beans the sign-in controller
 * shares with the filter chain.
 */
@Configuration
public class SecurityConfig {

    /**
     * Supplies the BCrypt encoder that hashes and checks passwords.
     *
     * @return (PasswordEncoder) a BCrypt encoder.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Supplies the repository that keeps the CSRF token in a cookie.
     *
     * @return (CsrfTokenRepository) the cookie repository, with the cookie readable by JavaScript.
     */
    @Bean
    public CsrfTokenRepository csrfTokenRepository() {
        return CookieCsrfTokenRepository.withHttpOnlyFalse();
    }

    /**
     * Supplies the handler that puts the CSRF token onto each request.
     *
     * @return (CsrfTokenRequestHandler) the attribute handler with lazy token creation switched off.
     */
    @Bean
    public CsrfTokenRequestHandler csrfTokenRequestHandler() {
        CsrfTokenRequestAttributeHandler handler = new CsrfTokenRequestAttributeHandler();
        // Switches off lazy token creation. This line is what makes the token cookie exist.
        handler.setCsrfRequestAttributeName(null);
        return handler;
    }

    /**
     * Supplies the repository a signed-in session is stored in and read back from.
     *
     * @return (SecurityContextRepository) a request attribute copy for the current request, and the HTTP session after it.
     */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new DelegatingSecurityContextRepository(
                new RequestAttributeSecurityContextRepository(),
                new HttpSessionSecurityContextRepository());
    }

    /**
     * Supplies what runs at the moment somebody authenticates: a new session id,
     * then a replacement CSRF token.
     *
     * @param csrfTokenRepository (CsrfTokenRepository) where the replacement token is written.
     * @param csrfTokenRequestHandler (CsrfTokenRequestHandler) how that token is put onto the request.
     * @return (SessionAuthenticationStrategy) the two strategies, run in that order.
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

    /**
     * Supplies the manager that checks a username and password.
     *
     * @param configuration (AuthenticationConfiguration) Spring Security's own assembly of the manager.
     * @return (AuthenticationManager) the manager built from the user details service and the BCrypt encoder.
     * @throws Exception when getAuthenticationManager cannot build it.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    /**
     * Builds the filter chain: route rules, logout, CSRF, session storage, and
     * refusal handling. The three bean parameters are the shared beans declared above.
     *
     * @param http (HttpSecurity) the builder Spring hands in.
     * @param csrfTokenRepository (CsrfTokenRepository) the shared token repository.
     * @param csrfTokenRequestHandler (CsrfTokenRequestHandler) the shared request handler.
     * @param securityContextRepository (SecurityContextRepository) the shared context repository.
     * @return (SecurityFilterChain) the built chain.
     * @throws Exception when the chain cannot be built.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            CsrfTokenRepository csrfTokenRepository,
            CsrfTokenRequestHandler csrfTokenRequestHandler,
            SecurityContextRepository securityContextRepository) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // /health answers only when the forwarded client address is this machine,
                // 127.0.0.1 or ::1. Rules are first-match, so it sits above anyRequest().
                .requestMatchers("/health").access(
                    new WebExpressionAuthorizationManager(
                        "hasIpAddress('127.0.0.1') or hasIpAddress('::1')"))

                // The React app's own files, reachable without a session. A file placed
                // in frontend/public needs its own entry here.
                .requestMatchers("/", "/index.html", "/assets/**",
                                 "/favicon.svg").permitAll()

                // The login screen.
                .requestMatchers("/login").permitAll()

                // The sign-in endpoint, reachable without a session. The CSRF filter still checks it.
                .requestMatchers("/api/login").permitAll()

                // hasRole("OWNER") matches the authority "ROLE_OWNER", which
                // DatabaseUserDetailsService builds from Role.OWNER. A third role gets its own line.
                .requestMatchers("/api/admin/**").hasRole("OWNER")

                // Everything else needs a logged-in session.
                .anyRequest().authenticated()
            )
            // Signing out answers a redirect to the login screen.
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .permitAll()
            )
            // CSRF uses the two beans declared above, which LoginController shares.
            .csrf(csrf -> csrf
                .csrfTokenRepository(csrfTokenRepository)
                .csrfTokenRequestHandler(csrfTokenRequestHandler)
            )
            // The context repository declared above, which LoginController saves to.
            .securityContext(securityContext -> securityContext
                .securityContextRepository(securityContextRepository)
            )
            // A signed-in caller refused for permission or over a CSRF token gets a one-word reason.
            .exceptionHandling(handling -> handling
                // The entry point redirects a logged-out visitor to the HTML login page.
                .authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/login"))
                .accessDeniedHandler(new DeniedReasonHandler())
            );

        return http.build();
    }
}