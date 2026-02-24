"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Appointment } from "@/types";

interface ActiveConsultationAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAppointment: Appointment | null;
}

export function ActiveConsultationAlertModal({
  isOpen,
  onClose,
  activeAppointment,
}: ActiveConsultationAlertModalProps) {
  const router = useRouter();

  if (!activeAppointment) return null;

  const patientName = activeAppointment.patient
    ? `${activeAppointment.patient.first_name} ${activeAppointment.patient.last_name}`
    : "Paciente";

  const handleGoToActive = () => {
    router.push(
      `/patients/${activeAppointment.patient_id}/medical-records/new?appointment_id=${activeAppointment.id}`,
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-warning mb-2">
            <AlertCircle className="w-5 h-5" />
            <DialogTitle className="text-warning">
              Consulta en Curso Detectada
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-foreground mt-4">
            Actualmente tiene una consulta activa con{" "}
            <span className="font-semibold text-brand-600">{patientName}</span>.
            Debe finalizarla antes de atender a otro paciente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGoToActive}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white"
          >
            Ir a la consulta actual
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
