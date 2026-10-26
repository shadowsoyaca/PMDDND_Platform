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
 * One row of the users table. Describes the table for Hibernate so Java can
 * read and write rows. The table itself is created by Flyway.
 */
@Entity
@Table(name = "users")
public class User {

    // The database assigns the id on insert.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    // Holds the BCrypt hash, never the password.
    @Column(name = "password_hash", nullable = false, length = 72)
    private String passwordHash;

    @Column(name = "person_name", nullable = false, length = 100)
    private String personName;

    // Stores the role as its name, such as "OWNER", not as a number.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // Required by JPA. Hibernate cannot instantiate the entity without it.
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