package com.pmd.dndplatform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/*
 * Phase 2 Story 4: makes the React app's own screens reachable by address.
 *
 * THE PROBLEM
 *
 * React draws its screens in the browser. There is only ever one real file,
 * index.html, and the React app decides which screen to show by looking at the
 * address in the bar. So /login is a screen inside a program, not a file
 * sitting on disk.
 *
 * Spring does not know that. Asked for /login, it looks for a matching
 * controller or file, finds neither, and answers 404. The visitor sees an error
 * page instead of the login screen.
 *
 * THE FIX
 *
 * Forward those addresses to index.html. The browser loads the React app, the
 * app reads the address, and it draws the matching screen.
 *
 * A forward, not a redirect. A redirect would send the browser to a new address
 * and the one originally asked for would be lost, which is exactly the
 * information React needs. A forward keeps the address in the bar and simply
 * hands back the contents of index.html.
 *
 * WHY THIS IS SAFE
 *
 * Forwarding does not grant access to anything. Every request still passes
 * through SecurityConfig first. A logged-out visitor asking for /roster is
 * caught by the default-deny rule and sent to the login screen before this
 * class is ever consulted. All this does is stop Spring answering 404 for
 * screens that live inside the React app.
 *
 * It is also what makes the Story 4 requirement true in practice: an
 * unauthenticated visitor sees only the login screen, whatever route they
 * request.
 *
 * WHY THE ROUTES ARE LISTED ONE BY ONE
 *
 * A catch-all pattern would be shorter, but it would also swallow genuine
 * mistakes: a typo in an API address would quietly return the React page
 * instead of a 404, and the frontend would try to read a web page as data.
 * Listing them means an unknown address still answers 404, which is the honest
 * response.
 *
 * ADD A LINE HERE whenever a new screen is added to the React app. Forgetting
 * shows up as a 404 when the address is typed in or reloaded, while clicking to
 * the same screen from inside the app works. That split is the symptom to
 * recognise, because it is otherwise a confusing one.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // The login screen. This is the address SecurityConfig sends logged-out
        // visitors to, and the address its loginPage setting names.
        registry.addViewController("/login").setViewName("forward:/index.html");
    }
}