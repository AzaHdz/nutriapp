import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteAppointment } from "@/app/actions/appointments";
import { AppointmentForm } from "@/components/AppointmentForm";
import { Button } from "@/components/ui/Button";
import { dayKey, timeInZone } from "@/lib/dates";

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireUser();
  const { id } = await params;

  const appointment = await prisma.appointment.findFirst({
    where: { id, userId }, // the userId filter is what blocks touching other accounts' appointments
    include: { patient: { select: { name: true } } },
  });
  if (!appointment) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-[12.5px] text-text-3">
        <Link href="/agenda" className="hover:underline">
          Agenda
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">Reprogramar</span>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">
        Reprogramar cita
      </h1>

      <AppointmentForm
        patients={[]}
        patientName={appointment.patient.name}
        values={{
          appointmentId: appointment.id,
          date: dayKey(appointment.startsAt),
          time: timeInZone(appointment.startsAt),
          durationMin: appointment.durationMin,
          notes: appointment.notes,
        }}
      />

      <div className="mt-8 border-t border-border pt-5">
        <p className="text-[12.5px] text-text-3">
          Si el paciente avisó que no viene, cancélala desde la agenda: así queda el registro.
          Eliminar es para citas creadas por error y no se puede deshacer.
        </p>
        <form action={deleteAppointment} className="mt-3">
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <Button type="submit" variant="destructive" size="sm">
            Eliminar cita
          </Button>
        </form>
      </div>
    </div>
  );
}
