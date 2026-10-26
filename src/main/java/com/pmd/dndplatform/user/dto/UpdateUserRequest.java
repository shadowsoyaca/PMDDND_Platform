package com.pmd.dndplatform.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/*
 * The body of a request to change an existing account. Only the person name
 * can be changed this way.
 */
public record UpdateUserRequest(

        @NotBlank(message = "Person name is required.")
        @Size(max = 100, message = "Person name must be 100 characters or fewer.")
        String personName
) {
}