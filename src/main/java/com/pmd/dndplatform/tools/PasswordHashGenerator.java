package com.pmd.dndplatform.tools;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.BufferedReader;
import java.io.InputStreamReader;

/*
 * Developer helper that turns a plain password into a BCrypt hash for
 * APP_OWNER_PASSWORD_HASH. Spring never runs this class. It is started by hand.
 */
public class PasswordHashGenerator {

    /*
     * Reads a password from the first argument or from the console and prints its hash.
     *
     * @param args (String[]) the password as the first argument, or empty to be asked.
     * @throws Exception when reading from the console fails.
     */
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