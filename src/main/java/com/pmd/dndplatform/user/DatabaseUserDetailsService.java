package com.pmd.dndplatform.user;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/*
 * Looks up an account in the database when Spring Security asks who a
 * username belongs to. Spring compares the password against the stored hash.
 */
@Service
public class DatabaseUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public DatabaseUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /*
     * Loads the account for a username and builds the Spring Security user from it.
     *
     * @param username (String) the login name to look up.
     * @return (UserDetails) the account's username, stored hash, role and enabled flag.
     * @throws UsernameNotFoundException when no account has that username.
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("No account: " + username));

        // .roles(...) adds the ROLE_ prefix that hasRole() in SecurityConfig expects.
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .roles(user.getRole().name())
                .disabled(!user.isEnabled())
                .build();
    }
}