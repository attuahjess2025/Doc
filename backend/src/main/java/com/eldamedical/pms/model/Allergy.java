package com.eldamedical.pms.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "patient_allergies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Allergy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    @JsonIgnore
    private Patient patient;

    @Column(nullable = false, length = 100)
    private String allergen;

    @Column(nullable = false, length = 30)
    private String severity; // MILD, MODERATE, SEVERE, ANAPHYLACTIC

    @Column(length = 255)
    private String reaction;
}
