package com.pmd.dndplatform.user.dto;

import com.pmd.dndplatform.user.Role;
import com.pmd.dndplatform.user.User;

import java.time.Instant;

/*
 * What goes back OUT to the browser for one account.
 *
 * This exists so the User entity is never sent out directly. The entity carries
 * the password hash; this does not. Sending the entity would leak the hash into
 * every response, into browser dev tools, and into any log that records
 * responses. Keeping a separate outbound shape makes that leak impossible
 * rather than merely unlikely.
 *
 * These are exactly the columns the DM's Manage Accounts table shows.
 */
public record UserSummary(
        Long id,
        String username,
        String personName,
        Role role,
        Instant createdAt
) {
    /* Copies the safe fields off an entity. The hash is simply not read. */
    public static UserSummary from(User user) {
        return new UserSummary(
                user.getId(),
                user.getUsername(),
                user.getPersonName(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}