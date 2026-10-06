package com.eldamedical.pms.repository;

import com.eldamedical.pms.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, String> {
    List<Appointment> findByPatientIdOrderByStartTimeDesc(String patientId);
    List<Appointment> findByDoctorIdAndStartTimeBetweenOrderByStartTimeAsc(
            String doctorId, OffsetDateTime start, OffsetDateTime end);
    List<Appointment> findByStatus(String status);
}
