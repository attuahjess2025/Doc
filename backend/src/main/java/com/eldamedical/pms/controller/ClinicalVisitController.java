package com.eldamedical.pms.controller;

import com.eldamedical.pms.model.ClinicalVisit;
import com.eldamedical.pms.repository.ClinicalVisitRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * REST controller for clinical visit (encounter) management.
 * GET /api/v1/visits/patient/{patientId}  — full history from day one, newest first
 * POST /api/v1/visits                      — create new encounter
 */
@RestController
@RequestMapping("/api/v1/visits")
@CrossOrigin(origins = "*")
public class ClinicalVisitController {

    private final ClinicalVisitRepository clinicalVisitRepository;

    public ClinicalVisitController(ClinicalVisitRepository clinicalVisitRepository) {
        this.clinicalVisitRepository = clinicalVisitRepository;
    }

    /**
     * Returns the full visit history for a patient from day one.
     * Serialized as a lean DTO to avoid Hibernate lazy-load issues.
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
    public ResponseEntity<List<Map<String, Object>>> getVisitsByPatient(@PathVariable String patientId) {
        List<ClinicalVisit> visits = clinicalVisitRepository.findByPatientIdOrderByEncounterTimeDesc(patientId);
        List<Map<String, Object>> dtos = visits.stream().map(v -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("id",              v.getId());
            dto.put("encounterTime",   v.getEncounterTime());
            dto.put("chiefComplaint",  v.getChiefComplaint());
            dto.put("clinicalNotes",   v.getClinicalNotes());
            dto.put("diagnosisIcd10",  v.getDiagnosisIcd10());
            dto.put("bpSystolic",      v.getBpSystolic());
            dto.put("bpDiastolic",     v.getBpDiastolic());
            dto.put("heartRate",       v.getHeartRate());
            dto.put("temperatureC",    v.getTemperatureC());
            dto.put("bmi",             v.getBmi());
            dto.put("oxygenSat",       v.getOxygenSat());
            dto.put("respRate",        v.getRespRate());
            dto.put("weightKg",        v.getWeightKg());
            dto.put("heightCm",        v.getHeightCm());
            if (v.getDoctor() != null) {
                dto.put("doctor", Map.of(
                    "id",        v.getDoctor().getId(),
                    "firstName", v.getDoctor().getFirstName(),
                    "lastName",  v.getDoctor().getLastName(),
                    "email",     v.getDoctor().getEmail()
                ));
            }
            dto.put("prescriptionCount", v.getPrescriptions() != null ? v.getPrescriptions().size() : 0);
            return dto;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    /**
     * Create a new clinical encounter/visit.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'NURSE')")
    public ResponseEntity<ClinicalVisit> createVisitEncounter(@Valid @RequestBody ClinicalVisit visit) {
        if (visit.getEncounterTime() == null) {
            visit.setEncounterTime(OffsetDateTime.now());
        }
        if (visit.getPrescriptions() != null) {
            visit.getPrescriptions().forEach(p -> {
                p.setClinicalVisit(visit);
                p.setPatient(visit.getPatient());
                p.setDoctor(visit.getDoctor());
            });
        }
        ClinicalVisit saved = clinicalVisitRepository.save(visit);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
