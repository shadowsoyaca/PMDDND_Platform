package com.pmd.dndplatform.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/*
 * Creates the owner account at startup from the app.owner.* settings when no
 * row with that username exists. An existing row is left untouched.
 */
@Component
public class OwnerBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OwnerBootstrap.class);

    private final UserRepository userRepository;
    private final String ownerUsername;
    private final String ownerPasswordHash;
    private final String ownerPersonName;

    public OwnerBootstrap(UserRepository userRepository,
                          @Value("${app.owner.username}") String ownerUsername,
                          @Value("${app.owner.password-hash}") String ownerPasswordHash,
                          @Value("${app.owner.person-name}") String ownerPersonName) {
        this.userRepository = userRepository;
        this.ownerUsername = ownerUsername;
        this.ownerPasswordHash = ownerPasswordHash;
        this.ownerPersonName = ownerPersonName;
    }

    /*
     * Checks for the owner row and inserts it when it is missing.
     *
     * @param args (ApplicationArguments) the startup arguments, unused.
     */
    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername(ownerUsername)) {
            // This early return is what stops an existing row being overwritten.
            log.info("Owner account '{}' already exists. Leaving it alone.", ownerUsername);
            return;
        }

        User owner = new User(ownerUsername, ownerPasswordHash, ownerPersonName, Role.OWNER);
        userRepository.save(owner);

        // Logs the username only, never the hash.
        log.info("No owner account found. Created owner account '{}' from the startup settings.",
                ownerUsername);
    }
}