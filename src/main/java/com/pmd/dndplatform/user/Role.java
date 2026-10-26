package com.pmd.dndplatform.user;

/*
 * The kinds of account the platform has. OWNER can reach the account
 * management endpoints. PLAYER cannot. A third role is added by naming it here
 * and giving it route access in SecurityConfig.
 */
public enum Role {
    OWNER,
    PLAYER
};