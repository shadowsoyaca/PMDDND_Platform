package com.pmd.dndplatform;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/*
 * CiProofTest.java
 *
 * Phase 2 Story 4.8. TEMPORARY. DELETE THIS FILE.
 *
 * This test fails on purpose. It exists for one push, to prove that a failing
 * backend test turns the "Backend tests" check red on the pull request. Two
 * acceptance criteria on the card ask for exactly that, and a check nobody has
 * ever seen fail is only a belief that it works.
 *
 * No Spring, no database. A plain unit test is enough, because what is being
 * proved is that the check reports a failure, not what caused it.
 *
 * It must be deleted before this branch is merged. If you are reading this on
 * main, something went wrong.
 */
class CiProofTest {

    @Test
    void deliberateFailure_provesTheBackendCheckGoesRed() {
        assertThat(1).isEqualTo(2);
    }
}
