package com.pmd.dndplatform.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/*
 * The body of a request to create an account. The annotations are checked
 * before the controller method runs, and a failed check answers 400.
 * There is no role field; every account made this way is a PLAYER.
 */
public record CreateUserRequest(

        // Letters, numbers, dash and underscore only. The dash is last in the
        // character class so it is literal.
        @NotBlank(message = "Username is required.")
        @Size(min = 3, max = 50, message = "Username must be 3 to 50 characters.")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$",
                 message = "A username can use letters, numbers, dashes and underscores only.")
        String username,

        // The maximum of 68 is tied to BCrypt's 72 byte limit.
        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 68, message = "Password must be 8 to 68 characters.")
        String password,

        @NotBlank(message = "Person name is required.")
        @Size(max = 100, message = "Person name must be 100 characters or fewer.")
        String personName
) {
}