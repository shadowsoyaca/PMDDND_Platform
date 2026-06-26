package com.pmd.dndplatform;

/*
HealthController.java

A simple Spring Boot REST controller that provides a health check endpoint 
for the PMD D&D Platform. This controller responds to GET requests at the 
"/health" URL and returns a message indicating that the platform is operational.

@RestController: Indicates that this class is a REST controller, allowing it to 
handle HTTP requests and return responses.

@GetMapping("/health"): Maps GET requests to the "/health" endpoint 
to the health() method.

*/

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    // Deploy marker (Story 10): bump this when validating the deploy process so
    // you can watch the new build go live through /health. "v1" -> "v2" -> ...
    private static final String VERSION = "v2";

    @GetMapping("/health")
    public String health() {
        return "PMD D&D Platform is up and running! Version: " + VERSION;
    }
}
