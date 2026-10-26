package com.pmd.dndplatform.user.dto;

/*
 * The JSON body the login screen sends when somebody signs in. The two field
 * names are the wire contract with auth.ts.
 * There are deliberately no validation annotations on this record.
 */
public record LoginRequest(
        String username,
        String password
) {
}
