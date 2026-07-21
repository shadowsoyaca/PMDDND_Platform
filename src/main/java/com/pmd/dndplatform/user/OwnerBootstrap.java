package com.pmd.dndplatform.user;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/*
 * Plants the owner account on first startup, so a brand-new database is never
 * locked out.
 *
 * How it works, in order:
 *   1. The app starts. Flyway has already created the users table.
 *   2. This runner looks for a row with the username in APP_OWNER_USERNAME.
 *   3. Found  -> do nothing. The database wins. Always.
 *      Missing -> insert it, using the BCrypt hash from APP_OWNER_PASSWORD_HASH.
 *
 * So the environment variables are no longer "your account". They are the SEED
 * that plants it once. After that, the database row is the real account, and
 * changing the environment variable does not change your password.
 *
 * If you ever lock yourself out: delete your row from the users table and
 * restart. This runner will plant it again from the variables.
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

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByUsername(ownerUsername)) {
            // Already planted. Never overwrite. The stored password stays the
            // stored password, even if the environment variable now differs.
            log.info("Owner account '{}' already exists. Leaving it alone.", ownerUsername);
            return;
        }

        User owner = new User(ownerUsername, ownerPasswordHash, ownerPersonName, Role.OWNER);
        userRepository.save(owner);

        // Log the username only. The hash is never logged.
        log.info("No owner account found. Created owner account '{}' from the startup settings.",
                ownerUsername);
    }
}