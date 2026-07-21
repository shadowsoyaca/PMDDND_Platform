-- V1__create_users_table.sql
--
-- Flyway runs this file once, in order, and then records that it ran.
-- It never runs again, on any machine. To change the table later, add a NEW
-- file (V2__..., V3__...). Never edit a file that has already run.
--
-- Phase 2 Story 3: the users table. Accounts are created by the owner only.

CREATE TABLE users (
    -- BIGSERIAL: Postgres assigns the next number automatically on insert.
    -- This id is the stable handle every other table will point at later,
    -- including the passkey table in the 6-series.
    id            BIGSERIAL    PRIMARY KEY,

    -- The login name. UNIQUE means the database itself refuses a duplicate,
    -- even if two requests arrive at the same instant. Postgres builds an
    -- index for UNIQUE automatically, so no separate index is needed here.
    username      VARCHAR(50)  NOT NULL UNIQUE,

    -- The BCrypt hash, never the real password. A BCrypt hash is 60
    -- characters; 72 leaves room if the settings are ever changed.
    password_hash VARCHAR(72)  NOT NULL,

    -- The real person behind the account. Visible to the owner only.
    person_name   VARCHAR(100) NOT NULL,

    -- Stored as the WORD ('OWNER', 'PLAYER'), not as a number. This matters:
    -- if roles were stored as numbers, adding a new role later could shift
    -- the meaning of the numbers already saved. Storing the word means a
    -- future third role (an assistant DM, for example) is just a new word.
    role          VARCHAR(30)  NOT NULL,

    -- Lets an account be switched off without deleting it. Not exposed in the
    -- API yet; the column exists so turning it on later needs no table change.
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,

    -- When the account was made. The app sets this; the DEFAULT is a backstop
    -- so a row can never end up without one. TIMESTAMPTZ stores the moment in
    -- time along with its time zone, so it reads correctly anywhere.
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);