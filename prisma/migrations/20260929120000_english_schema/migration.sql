-- Rename the Spanish schema to English. Every statement is a RENAME (or an
-- in-place UPDATE), so no data is dropped or copied.

-- Enums
ALTER TYPE "Genero" RENAME TO "Gender";
ALTER TYPE "Gender" RENAME VALUE 'FEMENINO' TO 'FEMALE';
ALTER TYPE "Gender" RENAME VALUE 'MASCULINO' TO 'MALE';
ALTER TYPE "Gender" RENAME VALUE 'OTRO' TO 'OTHER';

ALTER TYPE "EstadoCita" RENAME TO "AppointmentStatus";
ALTER TYPE "AppointmentStatus" RENAME VALUE 'PROGRAMADA' TO 'SCHEDULED';
ALTER TYPE "AppointmentStatus" RENAME VALUE 'CONFIRMADA' TO 'CONFIRMED';
ALTER TYPE "AppointmentStatus" RENAME VALUE 'CANCELADA' TO 'CANCELLED';
ALTER TYPE "AppointmentStatus" RENAME VALUE 'COMPLETADA' TO 'COMPLETED';

ALTER TYPE "EstadoCuenta" RENAME TO "AccountStatus";

ALTER TYPE "EstadoSolicitud" RENAME TO "FeatureRequestStatus";
ALTER TYPE "FeatureRequestStatus" RENAME VALUE 'NUEVA' TO 'NEW';
ALTER TYPE "FeatureRequestStatus" RENAME VALUE 'EN_REVISION' TO 'IN_REVIEW';
ALTER TYPE "FeatureRequestStatus" RENAME VALUE 'APROBADA' TO 'APPROVED';
ALTER TYPE "FeatureRequestStatus" RENAME VALUE 'RECHAZADA' TO 'REJECTED';
ALTER TYPE "FeatureRequestStatus" RENAME VALUE 'IMPLEMENTADA' TO 'IMPLEMENTED';

ALTER TYPE "Role" RENAME VALUE 'NUTRIOLOGO' TO 'NUTRITIONIST';
ALTER TYPE "PlanTier" RENAME VALUE 'ILIMITADO' TO 'UNLIMITED';

-- User
ALTER TABLE "User" RENAME COLUMN "cedula" TO "licenseNumber";
ALTER TABLE "User" RENAME COLUMN "estiloPrompt" TO "promptStyle";
ALTER TABLE "User" RENAME COLUMN "estado" TO "status";
ALTER TABLE "User" RENAME COLUMN "notasAdmin" TO "adminNotes";

-- Patient
ALTER TABLE "Paciente" RENAME TO "Patient";
ALTER TABLE "Patient" RENAME CONSTRAINT "Paciente_pkey" TO "Patient_pkey";
ALTER TABLE "Patient" RENAME CONSTRAINT "Paciente_userId_fkey" TO "Patient_userId_fkey";
ALTER INDEX "Paciente_userId_idx" RENAME TO "Patient_userId_idx";
ALTER TABLE "Patient" RENAME COLUMN "nombre" TO "name";
ALTER TABLE "Patient" RENAME COLUMN "fechaNacimiento" TO "birthDate";
ALTER TABLE "Patient" RENAME COLUMN "genero" TO "gender";
ALTER TABLE "Patient" RENAME COLUMN "telefono" TO "phone";
ALTER TABLE "Patient" RENAME COLUMN "notas" TO "notes";
ALTER TABLE "Patient" RENAME COLUMN "consentimientoAt" TO "consentAt";

-- Appointment
ALTER TABLE "Cita" RENAME TO "Appointment";
ALTER TABLE "Appointment" RENAME CONSTRAINT "Cita_pkey" TO "Appointment_pkey";
ALTER TABLE "Appointment" RENAME CONSTRAINT "Cita_pacienteId_fkey" TO "Appointment_patientId_fkey";
ALTER TABLE "Appointment" RENAME CONSTRAINT "Cita_userId_fkey" TO "Appointment_userId_fkey";
ALTER INDEX "Cita_pacienteId_idx" RENAME TO "Appointment_patientId_idx";
ALTER INDEX "Cita_userId_idx" RENAME TO "Appointment_userId_idx";
ALTER INDEX "Cita_userId_inicioAt_idx" RENAME TO "Appointment_userId_startsAt_idx";
ALTER TABLE "Appointment" RENAME COLUMN "pacienteId" TO "patientId";
ALTER TABLE "Appointment" RENAME COLUMN "inicioAt" TO "startsAt";
ALTER TABLE "Appointment" RENAME COLUMN "duracionMin" TO "durationMin";
ALTER TABLE "Appointment" RENAME COLUMN "estado" TO "status";
ALTER TABLE "Appointment" RENAME COLUMN "notas" TO "notes";

-- Consultation
ALTER TABLE "Consulta" RENAME TO "Consultation";
ALTER TABLE "Consultation" RENAME CONSTRAINT "Consulta_pkey" TO "Consultation_pkey";
ALTER TABLE "Consultation" RENAME CONSTRAINT "Consulta_pacienteId_fkey" TO "Consultation_patientId_fkey";
ALTER TABLE "Consultation" RENAME CONSTRAINT "Consulta_userId_fkey" TO "Consultation_userId_fkey";
ALTER INDEX "Consulta_pacienteId_idx" RENAME TO "Consultation_patientId_idx";
ALTER INDEX "Consulta_userId_idx" RENAME TO "Consultation_userId_idx";
ALTER TABLE "Consultation" RENAME COLUMN "pacienteId" TO "patientId";
ALTER TABLE "Consultation" RENAME COLUMN "peso" TO "weight";
ALTER TABLE "Consultation" RENAME COLUMN "altura" TO "height";
ALTER TABLE "Consultation" RENAME COLUMN "cintura" TO "waist";
ALTER TABLE "Consultation" RENAME COLUMN "cadera" TO "hip";
ALTER TABLE "Consultation" RENAME COLUMN "brazo" TO "arm";
ALTER TABLE "Consultation" RENAME COLUMN "grasaCorporal" TO "bodyFatPct";
ALTER TABLE "Consultation" RENAME COLUMN "objetivos" TO "goals";
ALTER TABLE "Consultation" RENAME COLUMN "restricciones" TO "restrictions";
ALTER TABLE "Consultation" RENAME COLUMN "transcripcion" TO "transcript";
ALTER TABLE "Consultation" RENAME COLUMN "planGenerado" TO "generatedPlan";
ALTER TABLE "Consultation" RENAME COLUMN "planFinal" TO "finalPlan";
ALTER TABLE "Consultation" RENAME COLUMN "modeloIA" TO "aiModel";
ALTER TABLE "Consultation" RENAME COLUMN "generaciones" TO "generationCount";
ALTER TABLE "Consultation" RENAME COLUMN "aprobadoAt" TO "approvedAt";

-- FeatureRequest
ALTER TABLE "Solicitud" RENAME TO "FeatureRequest";
ALTER TABLE "FeatureRequest" RENAME CONSTRAINT "Solicitud_pkey" TO "FeatureRequest_pkey";
ALTER TABLE "FeatureRequest" RENAME CONSTRAINT "Solicitud_userId_fkey" TO "FeatureRequest_userId_fkey";
ALTER INDEX "Solicitud_userId_idx" RENAME TO "FeatureRequest_userId_idx";
ALTER INDEX "Solicitud_estado_idx" RENAME TO "FeatureRequest_status_idx";
ALTER TABLE "FeatureRequest" RENAME COLUMN "titulo" TO "title";
ALTER TABLE "FeatureRequest" RENAME COLUMN "descripcion" TO "description";
ALTER TABLE "FeatureRequest" RENAME COLUMN "estado" TO "status";
ALTER TABLE "FeatureRequest" RENAME COLUMN "respuestaAdmin" TO "adminResponse";
ALTER TABLE "FeatureRequest" RENAME COLUMN "respondidoAt" TO "respondedAt";
ALTER TABLE "FeatureRequest" RENAME COLUMN "analisisIA" TO "aiAnalysis";
ALTER TABLE "FeatureRequest" RENAME COLUMN "veredictoIA" TO "aiVerdict";
ALTER TABLE "FeatureRequest" RENAME COLUMN "respuestaIA" TO "aiDraftResponse";
ALTER TABLE "FeatureRequest" RENAME COLUMN "analizadoAt" TO "analyzedAt";

UPDATE "FeatureRequest" SET "aiVerdict" = 'NOT_VIABLE' WHERE "aiVerdict" = 'NO_VIABLE';
UPDATE "FeatureRequest" SET "aiVerdict" = 'NEEDS_DESIGN' WHERE "aiVerdict" = 'REQUIERE_DISENO';
