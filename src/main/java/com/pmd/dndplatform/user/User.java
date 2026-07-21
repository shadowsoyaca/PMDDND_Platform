package com.pmd.dndplatform.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/*
 * The Java side of one row in the users table.
 *
 * This class does NOT create the table. Flyway does that (see
 * db/migration/V1__create_users_table.sql). This class only describes the
 * table so Java can read and write rows. Hibernate is set to "validate", which
 * means at startup it compares this class against the real table and refuses
 * to start if they disagree. That mismatch check is the safety net: if you add
 * a field here and forget the migration, the app tells you immediately instead
 * of failing later at runtime.
 */
@Entity
@Table(name = "users")
public class User {

    /*
     * IDENTITY means "the database picks the number" (the BIGSERIAL column).
     * Java leaves it null on a new object and reads it back after the insert.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    /* The BCrypt hash. The real password is never stored anywhere. */
    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;

    @Column(name = "person_name", nullable = false, length = 100)
    private String personName;

    /*
     * EnumType.STRING is the important part. It saves the word "OWNER".
     * The default (ORDINAL) would save the position number instead, which
     * silently breaks if the enum order ever changes.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    /* JPA requires a no-argument constructor. Not used by our own code. */
    protected User() {
    }

    public User(String username, String passwordHash, String personName, Role role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.personName = personName;
        this.role = role;
        this.enabled = true;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getPersonName() {
        return personName;
    }

    public void setPersonName(String personName) {
        this.personName = personName;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}