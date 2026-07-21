package com.pmd.dndplatform;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/*
 * The basic "does the app start at all" test.
 *
 * It supplies the three owner seed values, because the app refuses to start
 * without them (which is the intended behavior in real use).
 *
 * Phase 2 STORY 3: this test now quietly proves a lot more than it used to. Starting up
 * means the database connected, Flyway ran the migration, and Hibernate's
 * validate check agreed that the User class matches the real users table. If any
 * of those three are wrong, this test fails.
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