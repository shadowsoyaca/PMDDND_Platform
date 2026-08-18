package com.pmd.dndplatform.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/*
 * What the DM sends in to make a new account.
 *
 * This is a "record": a small, read-only data holder. Java writes the
 * constructor and the getters for us.
 *
 * The annotations are checked BEFORE the controller method runs. A request that
 * breaks one of them is rejected with 400 Bad Request and never reaches the
 * database. This is the backstop for the browser form, which will do its own
 * checking in Story 4. Never trust the browser alone.
 *
 * There is deliberately no "role" field. Every account made through this path
 * is a PLAYER. Creating another owner is not something a web form should do.
 */
public record CreateUserRequest(

        /*
         * NOTE: Phase 2 Story 5 - a format rule was added. Before this, a
         * username could hold anything at all, including spaces.
         *
         * Letters, numbers, a dash and an underscore. Nothing else.
         *
         * WHY THE RULE EXISTS
         *
         * A username is typed from memory, out loud, and sometimes copied off a
         * message. A space in one is invisible at the end, indistinguishable from
         * a run of two in the middle, and impossible to describe over a
         * conversation. Sign-in is an exact match, so a username nobody can state
         * accurately is a username somebody cannot use.
         *
         * WHAT IT DOES NOT DO
         *
         * It does not touch capitals. 'Misty' and 'misty' remain two different
         * accounts, and signing in has to match exactly. That was considered and
         * deliberately left alone.
         *
         * It also does not apply to the owner account, which is seeded from
         * environment variables by OwnerBootstrap and never passes through here.
         * An owner username with a space in it would keep working.
         *
         * The dash sits last inside the brackets on purpose. Anywhere else it
         * would mean a range, as in a-z, rather than the character itself.
         */
        @NotBlank(message = "Username is required.")
        @Size(min = 3, max = 50, message = "Username must be 3 to 50 characters.")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$",
                 message = "A username can use letters, numbers, dashes and underscores only.")
        String username,

        /*
         * NOTE: Phase 2 Story 5 - the maximum was 100 and is now 68.
         *
         * BCrypt hashes the first 72 BYTES of a password and ignores everything
         * after them. A longer password is not refused and does not fail; its
         * tail simply does nothing, so two passwords sharing their first 72 bytes
         * open the same account. Accepting 100 characters was therefore promising
         * something that was not true.
         *
         * 68 rather than 72, to leave room for a few characters that take more
         * than one byte, such as an accented letter. It is not a guarantee: 68
         * emoji are 272 bytes and would still be cut. That case is left alone on
         * purpose, because the result is a very long password whose end is
         * ignored rather than anything that breaks.
         *
         * Existing accounts are unaffected. This limits what may be sent in, and
         * the stored hash is 60 characters whatever the password was.
         */
        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 68, message = "Password must be 8 to 68 characters.")
        String password,

        @NotBlank(message = "Person name is required.")
        @Size(max = 100, message = "Person name must be 100 characters or fewer.")
        String personName
) {
}