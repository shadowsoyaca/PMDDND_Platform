/*
 * CiProof.test.ts
 *
 * Phase 2 Story 4.8. TEMPORARY. DELETE THIS FILE.
 *
 * The frontend half of the same proof as CiProofTest.java. It fails on purpose,
 * for one push, to show that a failing frontend test turns the "Frontend tests"
 * check red on the pull request.
 *
 * describe, it and expect are imported explicitly because the Vitest settings in
 * vite.config.ts do not switch on "globals". Without these imports the file
 * would fail with a reference error, which would still turn the check red but
 * for the wrong reason, and would prove nothing about a failing assertion.
 *
 * It must be deleted before this branch is merged.
 */
import { describe, it, expect } from 'vitest'

describe('CI proof', () => {
  it('fails on purpose, to prove the frontend check goes red', () => {
    expect(1).toBe(2)
  })
})
