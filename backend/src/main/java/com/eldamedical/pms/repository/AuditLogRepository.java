package com.eldamedical.pms.repository;

import com.eldamedical.pms.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    List<AuditLog> findTop100ByOrderByCreatedAtDesc();
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(String userId);
}
