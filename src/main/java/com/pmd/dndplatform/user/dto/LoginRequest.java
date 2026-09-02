package com.pmd.dndplatform.user.dto;

/*
 * Phase 2 Story 5.5: what the login screen sends when somebody signs in.
 *
 * WHY THIS EXISTS
 *
 * Phase 2 Story 4 built the login screen on Spring Security's form login, which
 * reads two named fields out of a form-encoded body. Story 5.5 replaces that with
 * an endpoint that takes JSON, and this record is the shape of that JSON.
 *
 * WHY THERE ARE NO VALIDATION ANNOTATIONS
 *
 * CreateUserRequest next door is covered in them, so their absence here is a
 * decision rather than an oversight.
 *
 * Validation answers 400 and says which field was wrong. On a sign-in that would
 * add a fourth answer to an endpoint whose whole purpose is to give exactly three,
 * and it would answer differently for an empty username than for a wrong one.
 * Every way of failing to sign in should look identical from outside, so a blank
 * field is left to fail authentication like anything else and comes back as the
 * same 401.
 *
 * There is nothing to protect against by validating early. Neither value is stored
 * and neither is put into a query by hand; the username goes to a parameterised
 * lookup and the password goes to BCrypt.
 *
 * WHY THE PASSWORD IS A PLAIN STRING
 *
 * A char array that can be blanked afterwards would be the careful answer in a
 * desktop program. It buys nothing here: Jackson has already built Strings while
 * reading the request body, and the password reaches BCrypt as a String whatever
 * this record holds. It would look more careful without being so.
 */
public record LoginRequest(
        String username,
        String password
) {
}
