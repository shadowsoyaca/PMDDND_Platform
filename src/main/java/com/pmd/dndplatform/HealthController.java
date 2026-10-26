package com.pmd.dndplatform;

/*
HealthController.java

Serves GET /health. It answers with one plain line naming the version of the
running build and the moment that build was made.
*/

import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.info.BuildProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    // The build information Maven recorded, absent when the code was not built by Maven.
    private final ObjectProvider<BuildProperties> buildProperties;

    /**
     * Builds the controller.
     *
     * @param buildProperties (ObjectProvider<BuildProperties>) the build information, which may be absent.
     */
    public HealthController(ObjectProvider<BuildProperties> buildProperties) {
        this.buildProperties = buildProperties;
    }

    /**
     * Answers GET /health. Missing build information still answers 200.
     *
     * @return (String) one line naming the running version and build time, or a
     *         line saying the build did not come from Maven.
     */
    @GetMapping("/health")
    public String health() {
        BuildProperties build = buildProperties.getIfAvailable();

        // No build information from Maven.
        if (build == null) {
            return "PMD D&D Platform is up and running! "
                    + "Version: development build, not produced by Maven";
        }

        // Prints the build time as UTC, cut to whole seconds.
        return "PMD D&D Platform is up and running! Version: " + build.getVersion()
                + ", built " + build.getTime().truncatedTo(ChronoUnit.SECONDS);
    }
}
