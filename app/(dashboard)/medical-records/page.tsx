"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMedicalRecords,
  createMedicalRecord,
  deleteMedicalRecord,
} from "@/services/medical-records";
import { getPatients } from "@/services/patients";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  User,
  Stethoscope,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { MedicalRecord, Patient } from "@/types";

// ─── New Record Modal ───────────────────────────────────────────────────────

function NewRecordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [content, setContent] = useState("");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const debouncedPatientSearch = useDebounce(patientSearch, 400);

  const { data: patientsData } = useQuery({
    queryKey: ["patients", "search", debouncedPatientSearch],
    queryFn: () =>
      getPatients({
        first_name: debouncedPatientSearch || undefined,
        cantidad: 5,
      }),
    enabled: debouncedPatientSearch.length > 1,
  });

  React.useEffect(() => {
    if (isOpen) {
      setPatientSearch("");
      setSelectedPatient(null);
      setDate(format(new Date(), "yyyy-MM-dd"));
      setContent("");
      setShowPatientDropdown(false);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: createMedicalRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      toast.success("Historia clínica registrada");
      onClose();
    },
    onError: () => toast.error("Error al registrar la historia clínica"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !user) return;

    mutation.mutate({
      patient_id: selectedPatient.id,
      doctor_id: user.id,
      date,
      content,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva Nota Clínica</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Patient Search */}
          <div className="relative">
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Paciente *
            </label>
            {selectedPatient ? (
              <div className="flex items-center justify-between px-3 py-2.5 bg-brand-50 border border-brand-200 rounded-[var(--radius-md)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                    {selectedPatient.first_name[0]}
                    {selectedPatient.last_name[0]}
                  </div>
                  <span className="text-sm font-medium text-brand-800">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch("");
                  }}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Buscar paciente por nombre..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                />
                {showPatientDropdown &&
                  patientsData &&
                  patientsData.data.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] overflow-hidden">
                      {patientsData.data.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowPatientDropdown(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-secondary transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                            {patient.first_name[0]}
                            {patient.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {patient.first_name} {patient.last_name}
                            </p>
                            {patient.cuit && (
                              <p className="text-xs text-muted">
                                CUIT: {patient.cuit}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Fecha *
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Notas de la Consulta *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Motivo de consulta, observaciones, diagnóstico, indicaciones, etc."
              required
              rows={6}
              className="w-full px-3 py-2.5 text-sm rounded-[var(--radius-md)] border border-border bg-surface hover:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !selectedPatient || !content}
            >
              {mutation.isPending ? <Spinner size="sm" /> : "Guardar Nota"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Medical Records Page ───────────────────────────────────────────────────

export default function MedicalRecordsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["medical-records", page],
    queryFn: () =>
      getMedicalRecords({
        pagina: page,
        cantidad: 10,
      }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMedicalRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["medical-records"] });
      toast.success("Registro eliminado correctamente");
    },
    onError: () => toast.error("Error al eliminar el registro"),
  });

  const records = data?.data || [];
  const totalPages = data?.meta?.last_page ?? 1;
  const totalRecords = data?.meta?.total ?? 0;

  const handleDelete = (id: number) => {
    if (
      confirm(
        "¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.",
      )
    ) {
      deleteMut.mutate(id);
    }
  };

  return (
    <div className="space-y-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Historias Clínicas
          </h1>
          <p className="text-sm text-muted mt-1">
            Registros médicos y notas de consulta de los pacientes.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Nota
        </Button>
      </div>

      {/* Records Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardBody className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted font-medium">
              No hay registros clínicos aún
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Crea la primera nota clínica usando el botón &quot;Nueva
              Nota&quot;.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((record: MedicalRecord) => {
            const isExpanded = expandedId === record.id;
            const shortContent =
              record.content.length > 150
                ? record.content.slice(0, 150) + "…"
                : record.content;

            return (
              <Card
                key={record.id}
                className="hover:shadow-[var(--shadow-md)] transition-all duration-200"
              >
                <CardBody className="space-y-3">
                  {/* Record Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Patient */}
                      {record.patient && (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
                            {record.patient.first_name[0]}
                            {record.patient.last_name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {record.patient.first_name}{" "}
                              {record.patient.last_name}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(record.date), "d MMM yyyy", {
                            locale: es,
                          })}
                        </span>
                        {record.doctor && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" />
                            Dr. {record.doctor.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setExpandedId(isExpanded ? null : record.id)
                        }
                        className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-foreground hover:bg-surface-secondary transition-all"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-[var(--radius-md)] text-muted hover:text-danger hover:bg-red-50 transition-all"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pl-0 md:pl-12">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {isExpanded ? record.content : shortContent}
                    </p>
                    {record.content.length > 150 && !isExpanded && (
                      <button
                        onClick={() => setExpandedId(record.id)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-1"
                      >
                        Leer más
                      </button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3">
              <p className="text-xs text-muted">
                Mostrando página {page} de {totalPages} ({totalRecords}{" "}
                registros)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-xs font-medium rounded-[var(--radius-md)] transition-all ${
                        page === pageNum
                          ? "bg-brand-600 text-white"
                          : "border border-border hover:bg-surface-secondary"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-medium rounded-[var(--radius-md)] border border-border hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Record Modal */}
      <NewRecordModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  );
}
