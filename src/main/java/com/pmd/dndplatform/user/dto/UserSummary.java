package com.pmd.dndplatform.user.dto;

import com.pmd.dndplatform.user.Role;
import com.pmd.dndplatform.user.User;

import java.time.Instant;

/*
 * One account as sent back to the browser. This record is the response
 * boundary: the User entity is never sent out directly.
 */
public record UserSummary(
        Long id,
        String username,
        String personName,
        Role role,
        Instant createdAt
) {
    /*
     * Copies the public fields off an entity. The hash is never read.
     *
     * @param user (User) the entity to copy from.
     * @return (UserSummary) the account without its hash.
     */
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