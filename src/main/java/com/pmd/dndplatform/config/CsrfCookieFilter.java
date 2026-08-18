package com.pmd.dndplatform.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/*
 * Phase 2 Story 5: makes sure the CSRF cookie actually reaches the browser.
 *
 * WHAT WAS WRONG
 *
 * Every first attempt at anything failed, and the second attempt worked. Signing
 * in took two tries. Signing out took two tries. Creating an account took two
 * tries. It was reproduced from the command line before this file was written:
 *
 *   GET  /login                 200, and no Set-Cookie at all
 *   POST /login, no token       403, and NOW a token cookie is sent
 *   POST /login, with token     302, signed in, and the cookie is DELETED
 *   POST /api/admin/users       403, and again a token cookie is sent
 *   POST /api/admin/users       201, created
 *
 * Two separate things combine into that.
 *
 * WHY THE COOKIE WAS NEVER WRITTEN
 *
 * Spring Security 6 loads the CSRF token lazily. The filter puts a supplier on
 * the request rather than a token, and the token is only created, and the cookie
 * only written, if something actually asks for it. A page built by React never
 * asks: it is static HTML and JavaScript, and the token means nothing until a
 * form is sent. So nothing ever asked, and no cookie was ever written.
 *
 * The only thing that did ask was the check performed when a request arrives
 * carrying a token to be validated. That is why a REFUSAL produced the cookie
 * that made the next attempt work.
 *
 * WHY SIGNING IN MADE IT WORSE
 *
 * On a successful sign-in, Spring Security deliberately throws the old token away
 * and issues a new one, so a token obtained before signing in cannot be reused
 * afterwards. That part is correct and should not be changed. But the replacement
 * is written under the same lazy rule, so the browser was told to delete its
 * cookie and never given the new value. Straight after signing in, the page held
 * no token at all, which is why the first change always failed.
 *
 * WHAT THIS FILTER DOES
 *
 * Asks for the token on every request. That is the whole of it. Asking is what
 * causes it to be created and the cookie to be written, so the browser always
 * holds a current one, including on the response that signs someone in.
 *
 * The call below looks like a line that does nothing and can be deleted. It is
 * not, and that is the reason this is a class with a comment rather than one
 * clever line in SecurityConfig.
 *
 * WHY NOT THE ONE-LINE ALTERNATIVE
 *
 * The same result can be had by setting the handler's request attribute name to
 * null, which turns the laziness off. It was rejected because nothing about a
 * null in a setter says "keep the cookie current", so the next person to read it
 * cannot tell what it is for, and this is exactly the kind of line that gets
 * tidied away by someone who cannot see what it does.
 *
 * A NOTE FOR LIVING_DOC.md
 *
 * The resolved conflict recorded as "CSRF cookie was never written" says adding
 * CsrfTokenRequestAttributeHandler resolves the token on every request. It does
 * not. Sign-in started working then because the refused first attempt wrote the
 * cookie, which also explains why "sign out failed roughly half the time" was
 * never really cured.
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    /*
     * Asks for the token, then lets the request carry on as normal.
     *
     * request  - the incoming request, which by this point carries the token
     *            supplier placed there by Spring Security's own CSRF filter.
     * response - the outgoing response, which is where the cookie is written.
     * chain    - the rest of the filters.
     *
     * Returns nothing.
     *
     * Raises ServletException or IOException only from the rest of the chain.
     * Nothing here throws on its own.
     *
     * The type check is a guard rather than a real case, and it is written as a
     * check rather than a plain cast on purpose. The attribute is always a
     * CsrfToken behind Spring Security's own CSRF filter. If that ever stopped
     * being true, because CSRF was switched off or a different request handler
     * was configured, a cast would throw on EVERY request and take the whole
     * application down. Skipping quietly is the right failure here: the worst
     * case is the two-attempt behaviour coming back, which the tests catch, and
     * not an outage.
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        if (request.getAttribute(CsrfToken.class.getName()) instanceof CsrfToken token) {
            /*
             * This is the line the whole file exists for. Reading the value is
             * what makes Spring Security create the token and write the cookie.
             * It looks discardable and is not.
             */
            token.getToken();
        }

        chain.doFilter(request, response);
    }
}
