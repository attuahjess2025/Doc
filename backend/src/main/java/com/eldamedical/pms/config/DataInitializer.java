package com.eldamedical.pms.config;

import com.eldamedical.pms.model.Role;
import com.eldamedical.pms.model.User;
import com.eldamedical.pms.repository.RoleRepository;
import com.eldamedical.pms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

/**
 * Seeds the database with default staff accounts on startup.
 * Idempotent — only inserts rows that do not already exist.
 */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    CommandLineRunner seedUsers(UserRepository userRepository,
                                RoleRepository roleRepository,
                                PasswordEncoder passwordEncoder) {
        return args -> {
            seedUser(userRepository, roleRepository, passwordEncoder,
                    "a.smith", "a.smith@eldamedical.com", "password123",
                    "Alexander", "Smith", "ROLE_DOCTOR");

            seedUser(userRepository, roleRepository, passwordEncoder,
                    "y.osei", "y.osei@eldamedical.com", "password123",
                    "Yemi", "Osei", "ROLE_DOCTOR");

            seedUser(userRepository, roleRepository, passwordEncoder,
                    "l.nguyen", "l.nguyen@eldamedical.com", "password123",
                    "Linh", "Nguyen", "ROLE_DOCTOR");

            seedUser(userRepository, roleRepository, passwordEncoder,
                    "p.rajan", "p.rajan@eldamedical.com", "password123",
                    "Priya", "Rajan", "ROLE_NURSE");

            seedUser(userRepository, roleRepository, passwordEncoder,
                    "j.park", "j.park@eldamedical.com", "password123",
                    "J.", "Park", "ROLE_RECEPTIONIST");

            seedUser(userRepository, roleRepository, passwordEncoder,
                    "c.vega", "c.vega@eldamedical.com", "password123",
                    "Carla", "Vega", "ROLE_ADMIN");

            log.info("✅  DataInitializer: staff accounts seeded successfully.");
        };
    }

    private void seedUser(UserRepository userRepo, RoleRepository roleRepo,
                          PasswordEncoder enc,
                          String username, String email, String rawPassword,
                          String firstName, String lastName, String roleId) {
        if (userRepo.existsByEmail(email)) {
            log.debug("⏭️   Skipping existing user: {}", email);
            return;
        }

        Role role = roleRepo.findById(roleId).orElse(null);
        if (role == null) {
            log.warn("⚠️  DataInitializer: role '{}' not found in DB — skipping user {}", roleId, email);
            return;
        }

        User user = User.builder()
                .id(UUID.randomUUID().toString())
                .username(username)
                .email(email)
                .passwordHash(enc.encode(rawPassword))
                .firstName(firstName)
                .lastName(lastName)
                .role(role)
                .active(true)
                .build();

        userRepo.save(user);
        log.info("👤  Seeded user: {} [{}]", email, roleId);
    }
}
