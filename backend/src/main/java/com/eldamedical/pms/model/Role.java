package com.eldamedical.pms.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role {

    @Id
    @Column(length = 30)
    private String id; // E.g., ROLE_ADMIN, ROLE_DOCTOR, ROLE_NURSE, ROLE_RECEPTIONIST

    @Column(nullable = false)
    private String description;
}
