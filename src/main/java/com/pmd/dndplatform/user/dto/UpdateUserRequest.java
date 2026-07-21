package com.pmd.dndplatform.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/*
 * What the DM can change on an existing account.
 *
 * Only the person name, on purpose. Username is the login handle and stays put.
 * Password changing is its own job with its own rules, and is a later story.
 */
public record UpdateUserRequest(

        @NotBlank(message = "Person name is required.")
        @Size(max = 100, message = "Person name must be 100 characters or fewer.")
        String personName
) {
}