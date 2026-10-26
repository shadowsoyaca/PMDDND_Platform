package com.pmd.dndplatform;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/*
 * Checks that the application context starts against the test database.
 * The three owner properties are what let the context start.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH,
        "app.owner.person-name=" + SecurityConfigTest.TEST_PERSON_NAME
})
@ActiveProfiles("test")
class DndplatformApplicationTests {

	@Test
	void contextLoads() {
	}

}