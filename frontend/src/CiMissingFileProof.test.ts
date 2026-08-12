/*
 * CiMissingFileProof.test.ts
 *
 * Phase 2 Story 4.8. TEMPORARY. DELETE THIS FILE.
 *
 * THIS FILE IS COMMITTED. The file it imports is NOT. That mismatch is the
 * whole point.
 *
 * On the development machine both files are on the disk, so this test passes
 * and nothing looks wrong. On the runner only this one arrives, because the
 * runner starts empty and clones the repository, so the import resolves to
 * nothing and the check goes red.
 *
 * This is the fault the story exists for, and it is the only one of the two the
 * laptop is genuinely incapable of noticing. The other, filename capitalisation,
 * is invisible on Windows for the same underlying reason.
 *
 * Deleted along with lib/ciMissingFile.ts once the check has gone red.
 */
import { describe, it, expect } from 'vitest'
import { PROOF } from './lib/ciMissingFile'

describe('CI proof, missing file', () => {
  it('passes locally and fails on the runner, because the import is not in the repository', () => {
    expect(PROOF).toContain('never committed')
  })
})
