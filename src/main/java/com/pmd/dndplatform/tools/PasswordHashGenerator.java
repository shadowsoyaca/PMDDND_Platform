package com.pmd.dndplatform.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.BufferedReader;
import java.io.InputStreamReader;

/*
 * Developer helper. This is NOT part of the running app. Spring never calls it.
 * It only runs when you start this class by hand.
 *
 * What it does: turns a plain password into a BCrypt hash. You run it on your
 * own computer, copy the printed hash into the APP_OWNER_PASSWORD_HASH
 * environment variable, and the plain password never has to be committed or
 * leave your machine.
 *
 * How to run it:
 *   Give the password as the first argument, or run it with no argument and
 *   type the password when it asks.
 */
public class PasswordHashGenerator {

    public static void main(String[] args) throws Exception {
        String password;

        if (args.length > 0) {
            password = args[0];
        } else {
            System.out.print("Enter the password to hash: ");
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            password = reader.readLine();
        }

        if (password == null || password.isBlank()) {
            System.err.println("No password given. Nothing to hash.");
            return;
        }

        String hash = new BCryptPasswordEncoder().encode(password);

        System.out.println();
        System.out.println("BCrypt hash (set this as APP_OWNER_PASSWORD_HASH):");
        System.out.println(hash);
    }
}