package com.pmd.dndplatform.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;

import java.io.IOException;

/*
 * Phase 2 Story 5: says WHY a request was refused, not merely that it was.
 *
 * THE PROBLEM THIS SOLVES
 *
 * Two completely different refusals arrive at the browser as the same 403:
 *
 *   1. You are not allowed to do this. A player asking for the account list.
 *      Nothing is wrong; the rule worked. Trying again will never help.
 *
 *   2. Your CSRF token was not accepted. Anyone can hit this, including the
 *      owner. Something IS wrong, and reloading the page fixes it, because a
 *      fresh token is issued on the next page load.
 *
 * With only a status code to look at, the screens had to guess, and they guessed
 * the first one. So a token problem was reported to the owner as "you do not have
 * permission to do that", which is both untrue and useless: it describes a
 * permanent state when the actual situation clears on a reload.
 *
 * That is not hypothetical. LIVING_DOC.md records sign out failing roughly half
 * the time on a wiped CSRF token, and the message that would have appeared says
 * nothing about tokens at all.
 *
 * HOW IT SAYS SO
 *
 * A short JSON body, one field, one of two fixed words. The status stays 403, so
 * nothing that already checks the status changes behaviour.
 *
 * WHY A FIXED WORD RATHER THAN THE EXCEPTION'S MESSAGE
 *
 * Sending the exception text would be the easy version and is the wrong one. It
 * writes internal detail into a response the browser can read, for every refusal
 * in the application, in exchange for wording nobody is going to show a player
 * anyway. Two known words carry everything the screens need and reveal nothing.
 *
 * This is the same reasoning that keeps server.error.include-message unset in
 * application.yaml, which is why the frontend writes its own messages elsewhere.
 *
 * WHAT THIS DOES NOT TOUCH
 *
 * Requests with no session at all. Those never reach here: they are caught
 * earlier and bounced to the login screen, which is what makes the login screen
 * the only thing an unauthenticated visitor can see. This handler only runs for
 * someone who is signed in and was refused anyway.
 */
public class DeniedReasonHandler implements AccessDeniedHandler {

    /* The token was missing or did not match. Reloading the page fixes it. */
    private static final String CSRF_BODY = "{\"reason\":\"csrf\"}";

    /* Signed in, and not allowed. Trying again changes nothing. */
    private static final String FORBIDDEN_BODY = "{\"reason\":\"forbidden\"}";

    /*
     * Answers a refused request.
     *
     * request  - the request that was refused. Not read; the reason is carried by
     *            the exception rather than by anything in the request.
     * response - what is sent back.
     * denied   - why Spring Security refused it.
     *
     * Returns nothing. The answer is written straight to the response.
     *
     * Raises IOException if the body cannot be written, which means the
     * connection has already gone. Nothing useful can be done about that here, so
     * it is left to the container.
     *
     * CsrfException is the parent of both CSRF failures, the missing token and
     * the wrong one. Catching the parent means both are covered, and a third one
     * added by a future Spring Security version is covered too.
     */
    @Override
    public void handle(HttpServletRequest request,
                       HttpServletResponse response,
                       AccessDeniedException denied) throws IOException {

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(denied instanceof CsrfException ? CSRF_BODY : FORBIDDEN_BODY);
    }
}
