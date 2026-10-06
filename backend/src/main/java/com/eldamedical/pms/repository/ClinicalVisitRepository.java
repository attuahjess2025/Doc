package com.eldamedical.pms.repository;

import com.eldamedical.pms.model.ClinicalVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClinicalVisitRepository extends JpaRepository<ClinicalVisit, String> {
    List<ClinicalVisit> findByPatientIdOrderByEncounterTimeDesc(String patientId);
    List<ClinicalVisit> findByDoctorIdOrderByEncounterTimeDesc(String doctorId);
}
