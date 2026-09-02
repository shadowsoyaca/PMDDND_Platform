package com.pmd.dndplatform.user.dto;

import com.pmd.dndplatform.user.User;

/*
 * Phase 2 Story 5.5: who you are now signed in as.
 *
 * WHY THIS EXISTS
 *
 * The sign-in endpoint answers with the account, so the login screen knows the
 * attempt worked without having to ask /api/me a moment later. Before this story
 * it had to ask, because form login answered with a redirect that said nothing.
 *
 * THESE ARE THE SAME THREE FIELDS /api/me ANSWERS WITH, ON PURPOSE
 *
 * The screens already understand that shape, so reusing it means nothing on the
 * frontend has to learn a second one. CurrentUserController was changed in this
 * story to return this record too, rather than building the same three fields as
 * a Map by hand, so there is one definition of the payload instead of two that
 * have to be kept in step.
 *
 * WHY NOT THE WHOLE USER RECORD
 *
 * Three named fields rather than the entity, for the same reason /api/me does it:
 * returning the entity would hand out the password hash and the internal id,
 * neither of which the browser has any use for. Naming the fields one by one means
 * a column added to the users table later cannot leak by accident.
 *
 * WHY THE ROLE IS HERE AT ALL
 *
 * Appearance only, and this is worth being clear about. Anything sent to a browser
 * can be edited by whoever holds it, so this decides which landing screen to draw
 * and nothing more. Every rule that matters is enforced on the server, by
 * SecurityConfig and the OWNER check on /api/admin/. A player who edits this value
 * sees a button that does not work.
 */
public record SignedInAccount(
        String username,
        String personName,
        String role
) {
    /*
     * Copies the three safe fields off an account.
     *
     * user - the row the sign-in matched.
     *
     * Returns the answer to send back.
     *
     * Raises nothing.
     *
     * The role is turned into its name rather than sent as the enum so the JSON
     * carries "OWNER" rather than whatever Jackson would decide to do with an enum
     * later. The frontend compares against that string.
     */
    public static SignedInAccount from(User user) {
        return new SignedInAccount(
                user.getUsername(),
                user.getPersonName(),
                user.getRole().name());
    }
}
