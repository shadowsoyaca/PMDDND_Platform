package com.pmd.dndplatform.user;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/*
 * This is what retires the in-memory owner from Story 2.
 *
 * When someone submits the login form, Spring Security asks a UserDetailsService
 * "who is this username?". In Story 2 that answer came from a single account
 * invented in Java. Now it comes from the database.
 *
 * Spring Boot finds this class automatically because it is the only
 * UserDetailsService in the app. It pairs it with the BCrypt encoder from
 * SecurityConfig and does the password comparison itself. We never compare
 * passwords by hand.
 */
@Service
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public DatabaseUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("No account: " + username));

        /*
         * Hand Spring Security the stored hash, not a password. It runs the
         * submitted password through BCrypt and compares the results.
         *
         * The .roles(...) call quietly adds the prefix "ROLE_", so Role.OWNER
         * becomes the authority "ROLE_OWNER". That is the name SecurityConfig's
         * hasRole("OWNER") is looking for. Spring's naming here is confusing;
         * the rule is that .roles() and hasRole() both add the prefix, and they
         * agree with each other.
         */
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .disabled(!user.isEnabled())
                .build();
    }
}