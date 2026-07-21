package com.pmd.dndplatform.user.dto;

import jakarta.validation.constraints.NotBlank;
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

        @NotBlank(message = "Username is required.")
        @Size(min = 3, max = 50, message = "Username must be 3 to 50 characters.")
        String username,

        @NotBlank(message = "Password is required.")
        @Size(min = 8, max = 100, message = "Password must be at least 8 characters.")
        String password,

        @NotBlank(message = "Person name is required.")
        @Size(max = 100, message = "Person name must be 100 characters or fewer.")
        String personName
) {
}