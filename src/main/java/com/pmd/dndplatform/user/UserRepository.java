package com.pmd.dndplatform.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/*
 * The database access point for users.
 *
 * You write no code here. Spring builds the class for you at startup. Extending
 * JpaRepository already gives save, findById, findAll, delete, count, and more.
 *
 * The three methods below are extra. Spring reads their NAMES and writes the
 * query itself: "findByUsername" becomes "select from users where username = ?".
 * That is why the naming has to be exact - the name IS the query.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /* Optional means "there might not be one", which forces the caller to handle the miss. */
    Optional<User> findByUsername(String username);

    /* Cheaper than loading the whole row when you only need a yes or no. */
    boolean existsByUsername(String username);

    /* Used to stop the last owner account from being deleted. */
    List<User> findByRole(Role role);
}