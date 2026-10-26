package com.pmd.dndplatform.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/*
 * Forwards the React app's own screen addresses to index.html, so a screen can
 * be reached by typing its address or reloading the page.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    /**
     * Registers each React screen address as a forward to index.html. The routes
     * are listed one by one, and each new screen needs its own line here.
     *
     * @param registry (ViewControllerRegistry) where the forwards are registered.
     */
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // The login screen. This is the address the entry point in SecurityConfig
        // redirects logged-out visitors to.
        registry.addViewController("/login").setViewName("forward:/index.html");

        // The account table. There is deliberately no OWNER rule beside this line.
        registry.addViewController("/accounts").setViewName("forward:/index.html");
    }
}