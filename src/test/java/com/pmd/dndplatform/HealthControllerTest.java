package com.pmd.dndplatform;

/*
HealthControllerTest.java

Phase 2 Story 4.5.

Proves that /health reports what the build actually is, and that it still
answers when there is no build information to report.

These tests do not start the application. They build the controller directly
and read what its method returns, which is enough because the whole of the
controller is that one string. That /health is mapped, reachable from this
machine, and blocked from outside is already proven by SecurityConfigTest, and
is not repeated here.

Two things are deliberately NOT tested here, because a test is the wrong tool
for them:

  - That two builds produce two different timestamps. That is a fact about
    Maven, not about this class, and it is checked by building twice and
    comparing.
  - That no hand-typed version survives anywhere. That is a search across the
    whole source tree, which a test in one file cannot honestly claim to do.
*/

import java.time.Instant;
import java.util.Properties;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.boot.info.BuildProperties;

import static org.assertj.core.api.Assertions.assertThat;

class HealthControllerTest {

    /*
     * A build time with milliseconds on the end on purpose. The controller is
     * meant to drop them, and a round number would not prove that.
     */
    private static final Instant BUILD_TIME = Instant.parse("2026-08-06T18:22:04.987Z");

    /*
     * A version this project will never reach. The numbering is phase.story.child
     * and there will not be a phase 99, so nothing real can ever collide with it.
     * 9.9.9 was considered and rejected for exactly that reason: phases can pass
     * nine, and a fixture that quietly becomes a real version number is a trap.
     *
     * Invented rather than real on purpose. It makes clear that the test
     * describes a made-up build, it means the test does not need editing every
     * time pom.xml is bumped, and it keeps a hardcoded version out of the source,
     * which is the thing this story set out to remove.
     */
    private static final String VERSION = "99.9.9-test";

    /**
     * Builds a controller that has build information available to it.
     *
     * @return a controller wired to a BuildProperties describing a known build.
     *
     * Why a real bean factory rather than a stub: the controller asks for its
     * build information through ObjectProvider, and the behaviour that matters
     * is what a real ObjectProvider does when the bean is there and when it is
     * not. Writing a stub would test the stub. Registering the bean in a real
     * DefaultListableBeanFactory and asking it for a provider gives the same
     * object Spring would give the running application, without starting one.
     */
    private HealthController controllerWithBuildInfo() {
        Properties properties = new Properties();
        properties.setProperty("group", "com.pmd");
        properties.setProperty("artifact", "dndplatform");
        properties.setProperty("version", VERSION);

        /*
         * BuildProperties stores the build time as epoch milliseconds in a
         * plain string, which is the format the build-info file uses. Converting
         * from an Instant here keeps the expected value above readable.
         */
        properties.setProperty("time", String.valueOf(BUILD_TIME.toEpochMilli()));

        DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
        factory.registerSingleton("buildProperties", new BuildProperties(properties));

        return new HealthController(factory.getBeanProvider(BuildProperties.class));
    }

    /**
     * Builds a controller with no build information, which is what a run started
     * from VS Code rather than from Maven looks like.
     *
     * @return a controller whose provider will hand back null.
     */
    private HealthController controllerWithoutBuildInfo() {
        DefaultListableBeanFactory factory = new DefaultListableBeanFactory();
        return new HealthController(factory.getBeanProvider(BuildProperties.class));
    }

    /**
     * The response names the version the build was made with, rather than a
     * value typed into the class. This is the whole point of the story: before
     * it, the answer was the fixed text "v2" whatever the build was.
     */
    @Test
    void health_reportsTheVersionTheBuildWasMadeWith() {
        assertThat(controllerWithBuildInfo().health())
                .contains("Version: " + VERSION);
    }

    /**
     * The response names the build time, written as UTC and cut to whole
     * seconds. The milliseconds in BUILD_TIME must not appear, because reading
     * this in a browser to compare against a deploy does not need them.
     */
    @Test
    void health_reportsTheBuildTimeAsUtcSeconds() {
        String response = controllerWithBuildInfo().health();

        assertThat(response).contains("built 2026-08-06T18:22:04Z");
        assertThat(response).doesNotContain("987");
    }

    /**
     * The response says nothing beyond the version and the build time. Checked
     * because this endpoint answers before anyone has logged in, so anything
     * added to it later is exposed by default.
     */
    @Test
    void health_saysNothingAboutTheMachineItIsRunningOn() {
        assertThat(controllerWithBuildInfo().health())
                .isEqualTo("PMD D&D Platform is up and running! "
                        + "Version: " + VERSION + ", built 2026-08-06T18:22:04Z");
    }

    /**
     * With no build information the controller still answers, and says plainly
     * that the build did not come from Maven instead of inventing a version.
     *
     * This case matters more than it looks. If a missing BuildProperties bean
     * stopped the application starting, it would break every local run started
     * from VS Code while working perfectly on the server.
     */
    @Test
    void health_withNoBuildInformation_saysSoRatherThanGuessing() {
        String response = controllerWithoutBuildInfo().health();

        assertThat(response).contains("up and running");
        assertThat(response).contains("development build, not produced by Maven");
        assertThat(response).doesNotContain(VERSION);
    }
}
