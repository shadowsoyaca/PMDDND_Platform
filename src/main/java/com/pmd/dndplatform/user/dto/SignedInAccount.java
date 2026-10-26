package com.pmd.dndplatform.user.dto;

import com.pmd.dndplatform.user.User;

/*
 * The account details sent back after a sign-in: username, person name and
 * role. The fields are the same ones /api/me answers with.
 */
public record SignedInAccount(
        String username,
        String personName,
        String role
) {
    /**
     * Copies the three safe fields off an account.
     *
     * @param user (User) the row the sign-in matched.
     * @return (SignedInAccount) the answer to send back.
     */
    public static SignedInAccount from(User user) {
        // .name() puts the role on the wire as the literal the frontend matches, such as "OWNER".
        return new SignedInAccount(
                user.getUsername(),
                user.getPersonName(),
                user.getRole().name());
    }
}
