package com.pmd.dndplatform.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.csrf.CsrfException;

import java.io.IOException;

/*
 * Answers a refused request with a 403 carrying one JSON field that says which
 * kind of refusal it was: a CSRF token problem, or a lack of permission.
 */
public class DeniedReasonHandler implements AccessDeniedHandler {

    /* The token was missing or did not match. The frontend reads this word by name. */
    private static final String CSRF_BODY = "{\"reason\":\"csrf\"}";

    /* Signed in, and not allowed. The frontend reads this word by name. */
    private static final String FORBIDDEN_BODY = "{\"reason\":\"forbidden\"}";

    /**
     * Writes the 403 and the reason body. CsrfException is the parent of both
     * CSRF failures, the missing token and the wrong one.
     *
     * @param request (HttpServletRequest) the request that was refused. Not read.
     * @param response (HttpServletResponse) what is sent back.
     * @param denied (AccessDeniedException) why Spring Security refused it.
     * @throws IOException if the body cannot be written.
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
