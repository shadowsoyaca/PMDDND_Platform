package com.pmd.dndplatform;

/*
HealthControllerTest.java

Proves that /health reports the version and build time the build supplied, and
that it still answers when there is no build information.
*/

import java.time.Instant;
import java.util.Properties;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.boot.info.BuildProperties;

import static org.assertj.core.api.Assertions.assertThat;

class HealthControllerTest {

    // Carries milliseconds so the cut to whole seconds is proven.
    private static final Instant BUILD_TIME = Instant.parse("2026-08-06T18:22:04.987Z");

    // An invented version that no real build will ever carry.
    private static final String VERSION = "99.9.9-test";

    /**
     * Builds a controller that has build information available to it.
     *
     * @return (HealthController) a controller wired to a BuildProperties describing a known build.
     */
    private HealthController controllerWithBuildInfo() {
        Properties properties = new Properties();
        properties.setProperty("group", "com.pmd");
        properties.setProperty("artifact", "dndplatform");
        properties.setProperty("version", VERSION);

        // BuildProperties keeps the build time as epoch milliseconds in a plain string.
        properties.setProperty("time", String.valueOf(BUILD_TIME.toEpochMilli()));

        DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
        factory.registerSingleton("buildProperties", new BuildProperties(properties));

        return new HealthController(factory.getBeanProvider(BuildProperties.class));
    }

    /**
     * Builds a controller with no build information available to it.
     *
     * @return (HealthController) a controller whose provider hands back null.
     */
    private HealthController controllerWithoutBuildInfo() {
        DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
        return new HealthController(factory.getBeanProvider(BuildProperties.class));
    }

    // Checks the response names the version from the build information.
    @Test
    void health_reportsTheVersionTheBuildWasMadeWith() {
        assertThat(controllerWithBuildInfo().health())
                .contains("Version: " + VERSION);
    }

    // Checks the build time is printed as UTC with the milliseconds removed.
    @Test
    void health_reportsTheBuildTimeAsUtcSeconds() {
        String response = controllerWithBuildInfo().health();

        assertThat(response).contains("built 2026-08-06T18:22:04Z");
        assertThat(response).doesNotContain("987");
    }

    // Checks the whole response. The equality is exact on purpose.
    @Test
    void health_saysNothingAboutTheMachineItIsRunningOn() {
        assertThat(controllerWithBuildInfo().health())
                .isEqualTo("PMD D&D Platform is up and running! "
                        + "Version: " + VERSION + ", built 2026-08-06T18:22:04Z");
    }

    // Checks the controller still answers, and says so, when there is no build information.
    @Test
    void health_withNoBuildInformation_saysSoRatherThanGuessing() {
        String response = controllerWithoutBuildInfo().health();

        assertThat(response).contains("up and running");
        assertThat(response).contains("development build, not produced by Maven");
        assertThat(response).doesNotContain(VERSION);
    }
}
