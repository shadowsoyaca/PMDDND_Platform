package com.pmd.dndplatform;

/*
HealthController.java

Serves GET /health. It answers with one plain line naming the version of the
running build and the moment that build was made.

Two things read it. A person, checking the application is alive. The deploy
script on the server, which polls it after a restart and treats an HTTP success
as a successful deploy.

Came from Phase 1 Story 10. Rewritten in Phase 2 Story 4.5, which replaced a
version typed in by hand with values the build supplies. The old constant said
"v2" and would have said "v2" forever, which is worse than saying nothing,
because sooner or later somebody reads it and believes it.

The response deliberately carries nothing else. No paths, no host names, no
environment details. SecurityConfig limits this endpoint to the machine it is
running on, but a security rule is a thing that can be changed by accident, so
the response is not treated as a private place.

@RestController: the return value of each method is the response body itself,
rather than the name of a page to draw.
*/

import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.info.BuildProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    /*
     * NOTE: Phase 2 Story 4.5 - replaces the hand-typed VERSION constant.
     *
     * BuildProperties holds what Maven recorded while building: the version out
     * of pom.xml, and the clock time the build ran. Spring Boot creates it only
     * when META-INF/build-info.properties is on the classpath, and that file is
     * only written when Maven built the code.
     *
     * ObjectProvider is the reason this is not a plain BuildProperties field.
     * A plain constructor parameter is a demand, and Spring refuses to start
     * when a demanded bean is missing. Starting the application straight from
     * VS Code compiles with the IDE's compiler rather than with Maven, so there
     * is no build-info file and no bean. A demand would therefore stop the
     * application starting on the development machine while working perfectly
     * on the server, which is close to the worst shape a fault can take.
     * ObjectProvider asks rather than demands, and hands back null for no.
     */
    private final ObjectProvider<BuildProperties> buildProperties;

    /**
     * Builds the controller.
     *
     * @param buildProperties a way of asking for the build information, which
     *                        may or may not be present. Spring supplies this
     *                        automatically; there is no other caller.
     */
    public HealthController(ObjectProvider<BuildProperties> buildProperties) {
        this.buildProperties = buildProperties;
    }

    /**
     * Answers GET /health.
     *
     * @return one line of plain text naming the running version and the time it
     *         was built, or a line saying the build did not come from Maven when
     *         no build information is available.
     * @throws none. The endpoint answers 200 in both cases on purpose. The
     *         deploy script decides a deploy succeeded from the HTTP status, so
     *         an error status here would report a healthy application as a
     *         failed deploy over something that is only a missing label.
     */
    @GetMapping("/health")
    public String health() {
        BuildProperties build = buildProperties.getIfAvailable();

        /*
         * No build information. This is the local IDE run described above. Say
         * so plainly rather than inventing a version, because a made-up version
         * is the exact problem this story exists to remove.
         */
        if (build == null) {
            return "PMD D&D Platform is up and running! "
                    + "Version: development build, not produced by Maven";
        }

        /*
         * getTime() is an Instant, which is a moment in UTC with no time zone
         * attached. Printing it as UTC rather than converting to the server's
         * local zone means the value cannot be misread, and the server is in a
         * different zone from this machine anyway.
         *
         * Truncated to whole seconds because the milliseconds are noise when the
         * point is reading it in a browser and comparing it to a deploy.
         */
        return "PMD D&D Platform is up and running! Version: " + build.getVersion()
                + ", built " + build.getTime().truncatedTo(ChronoUnit.SECONDS);
    }
}
