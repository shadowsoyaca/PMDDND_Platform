package com.pmd.dndplatform.user;

/*
 * The kinds of account the platform has.
 *
 * OWNER  - you, the DM. Can reach the account-management endpoints.
 * PLAYER - everyone you invite. Cannot manage accounts.
 *
 * Adding a third role later (an assistant DM who can run sessions but not
 * touch accounts) means: add the name here, and give it whatever route access
 * it should have in SecurityConfig. No database change is needed, because the
 * role column stores the WORD, not a number.
 */
public enum Role {
    OWNER,
    PLAYER
};