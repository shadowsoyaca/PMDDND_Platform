package com.pmd.dndplatform;
 
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
 
/*
 * Now that the owner account is read from environment variables, this basic
 * startup test supplies test values for them so the app context can start.
 * Without them the app would refuse to start, which is the intended behavior
 * in real use.
 */
@SpringBootTest(properties = {
        "app.owner.username=" + SecurityConfigTest.TEST_USER,
        "app.owner.password-hash=" + SecurityConfigTest.TEST_HASH
})
class DndplatformApplicationTests {
 
	@Test
	void contextLoads() {
	}
 
}
 