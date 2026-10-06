package com.eldamedical.pms.controller;

import com.eldamedical.pms.model.Patient;
import com.eldamedical.pms.repository.PatientRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patients")
@CrossOrigin(origins = "*")
public class PatientController {

    private final PatientRepository patientRepository;

    public PatientController(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')")
    public ResponseEntity<List<Patient>> getAllPatients(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(patientRepository.searchPatients(search));
        }
        return ResponseEntity.ok(patientRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST')")
    public ResponseEntity<Patient> getPatientById(@PathVariable String id) {
        return patientRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<Patient> registerPatient(@Valid @RequestBody Patient patient) {
        if (patient.getMrn() == null || patient.getMrn().isBlank()) {
            patient.setMrn("ELD-2026-" + String.format("%04d", (int)(Math.random() * 9000 + 1000)));
        }
        Patient saved = patientRepository.save(patient);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<Patient> updatePatient(@PathVariable String id, @Valid @RequestBody Patient patientDetails) {
        return patientRepository.findById(id)
                .map(existing -> {
                    existing.setFirstName(patientDetails.getFirstName());
                    existing.setLastName(patientDetails.getLastName());
                    existing.setPhone(patientDetails.getPhone());
                    existing.setEmail(patientDetails.getEmail());
                    existing.setAddress(patientDetails.getAddress());
                    existing.setEmergencyContactName(patientDetails.getEmergencyContactName());
                    existing.setEmergencyContactPhone(patientDetails.getEmergencyContactPhone());
                    existing.setInsuranceProvider(patientDetails.getInsuranceProvider());
                    existing.setInsurancePolicyNumber(patientDetails.getInsurancePolicyNumber());
                    return ResponseEntity.ok(patientRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
