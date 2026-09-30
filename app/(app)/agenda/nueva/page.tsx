import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppointmentForm } from "@/components/AppointmentForm";
import { buttonVariants } from "@/components/ui/Button";
import { todayKey } from "@/lib/dates";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; paciente?: string }>;
}) {
  const { userId } = await requireUser();
  // `dia` and `paciente` are URL query params, which stay in Spanish
  const sp = await searchParams;

  const patients = await prisma.patient.findMany({
    where: { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const day = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : todayKey();

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-[12.5px] text-text-3">
        <Link href="/agenda" className="hover:underline">
          Agenda
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">Nueva cita</span>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Nueva cita</h1>

      {patients.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-border-strong p-8 text-center">
          <p className="text-sm text-text-3">
            Necesitas al menos un paciente para agendar una cita.
          </p>
          <Link
            href="/pacientes/nuevo"
            className={buttonVariants({ size: "sm", className: "mt-3" })}
          >
            + Nuevo paciente
          </Link>
        </div>
      ) : (
        <AppointmentForm patients={patients} values={{ date: day, patientId: sp.paciente }} />
      )}
    </div>
  );
}
