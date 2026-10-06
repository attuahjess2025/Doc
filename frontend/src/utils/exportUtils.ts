// Export utilities for Patient Charts, SOAP Encounters (PDF/Print) and HIPAA Audit Logs (CSV)

export function printPatientChart(patient: any, encounter: any, visits: any[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Clinical Record - ${patient.name} (${patient.id})</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7A1C1C; padding-bottom: 15px; margin-bottom: 20px; }
          .logo { color: #7A1C1C; font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .sub { color: #b8860b; font-size: 13px; font-weight: 600; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .field-label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
          .field-val { font-size: 14px; font-weight: 600; color: #0f172a; }
          .section-title { color: #7A1C1C; font-size: 14px; font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; text-transform: uppercase; }
          .soap-box { background: #fafafa; padding: 12px; border-left: 3px solid #7A1C1C; border-radius: 4px; margin-bottom: 10px; }
          .rx-item { padding: 6px 0; border-bottom: 1px border #f1f5f9; font-size: 13px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">Elda Medical Service</div>
            <div class="sub">Clinical Management Record</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold;">MRN: ${patient.id}</div>
            <div style="font-size: 12px; color: #64748b;">Printed: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="grid">
          <div><div class="field-label">Patient Name</div><div class="field-val">${patient.name}</div></div>
          <div><div class="field-label">Date of Birth / Age</div><div class="field-val">${patient.dob || 'N/A'} (${patient.age} yrs)</div></div>
          <div><div class="field-label">Gender</div><div class="field-val">${patient.gender || '—'}</div></div>
          <div><div class="field-label">Insurance Provider</div><div class="field-val">${patient.insurance}</div></div>
          <div><div class="field-label">Phone</div><div class="field-val">${patient.phone}</div></div>
          <div><div class="field-label">Allergies</div><div class="field-val" style="color: #dc2626;">${patient.allergies?.length ? patient.allergies.join(', ') : 'None documented'}</div></div>
        </div>

        ${encounter ? `
          <div class="section-title">Latest Encounter Findings (SOAP)</div>
          ${encounter.vitals ? `
            <div style="display: flex; gap: 15px; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 12px;">
              <div><b>BP:</b> ${encounter.vitals.bp || 'N/A'}</div>
              <div><b>HR:</b> ${encounter.vitals.hr || 'N/A'} bpm</div>
              <div><b>Temp:</b> ${encounter.vitals.temp || 'N/A'} °F</div>
              <div><b>BMI:</b> ${encounter.vitals.bmi || 'N/A'} kg/m²</div>
            </div>
          ` : ''}
          <div class="soap-box"><b>Subjective:</b> ${encounter.soap?.subjective || 'N/A'}</div>
          <div class="soap-box"><b>Objective:</b> ${encounter.soap?.objective || 'N/A'}</div>
          <div class="soap-box"><b>Assessment:</b> ${encounter.soap?.assessment || 'N/A'}</div>
          <div class="soap-box"><b>Plan:</b> ${encounter.soap?.plan || 'N/A'}</div>

          ${encounter.rx?.length ? `
            <div class="section-title">Prescriptions Issued</div>
            ${encounter.rx.map((r: any) => `<div class="rx-item"><b>${r.drug} ${r.dose}</b> — ${r.freq} (${r.route})</div>`).join('')}
          ` : ''}
        ` : ''}

        <div class="footer">
          Confidential Patient Health Information (PHI) — Protected under HIPAA regulations · Elda Medical Service
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
}

export function exportAuditLogsToCSV(auditLogs: any[]) {
  const headers = ['Timestamp', 'User', 'Role', 'Action', 'Resource', 'IP Address', 'Severity Level'];
  const rows = auditLogs.map(l => [
    `"${l.ts}"`,
    `"${l.user}"`,
    `"${l.role}"`,
    `"${l.action}"`,
    `"${l.resource.replace(/"/g, '""')}"`,
    `"${l.ip}"`,
    `"${l.level}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `HIPAA_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
