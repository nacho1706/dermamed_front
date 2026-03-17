"use client";

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  User,
  ClipboardList,
  Stethoscope,
  Paperclip,
  Loader2,
  Trash2,
  ImagePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { getMedicalRecord } from "@/services/medical-records";
import { fetchAttachmentAsObjectUrl } from "@/services/medical-record-attachments";
import {
  useUploadAttachments,
  useDeleteAttachment,
} from "@/hooks/mutations/useMedicalRecordAttachments";
import { useAuth } from "@/contexts/auth-context";
import { formatLocalDate } from "@/lib/timezone";
import { Suspense } from "react";
import type { MedicalRecordAttachment } from "@/types";

// ─── Attachment Link Row ──────────────────────────────────────────────────────
// Bug 3B: Muestra un enlace de texto en lugar de renderizar <img>.
// Al click abre el blob en una nueva pestaña y revoca el ObjectURL después
// de 60 s para evitar memory leaks sin interrumpir la carga del archivo.

interface AttachmentLinkProps {
  attachment: MedicalRecordAttachment;
  medicalRecordId: number;
  canDelete: boolean;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function AttachmentLink({
  attachment,
  medicalRecordId,
  canDelete,
  onDelete,
  isDeleting,
}: AttachmentLinkProps) {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpen = async () => {
    if (isOpening) return;
    setIsOpening(true);
    try {
      const url = await fetchAttachmentAsObjectUrl(
        medicalRecordId,
        attachment.id,
      );
      window.open(url, "_blank");
      // Revocar después de dar tiempo al browser para cargar el blob
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setIsOpening(false);
    }
  };

  const sizeKb = Math.round(attachment.size / 1024);

  return (
    <div className="flex items-center justify-between gap-2 py-1.5 group">
      <button
        onClick={handleOpen}
        disabled={isOpening}
        className="flex items-center gap-2 text-left min-w-0 flex-1 hover:underline disabled:opacity-60"
        title={`Abrir ${attachment.original_name} en nueva pestaña`}
      >
        {isOpening ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-slate-400" />
        ) : (
          <Paperclip className="w-4 h-4 shrink-0 text-slate-400" />
        )}
        <span className="text-sm font-medium text-slate-900 truncate">
          {attachment.original_name}
        </span>
        <span className="text-xs text-slate-400 shrink-0">{sizeKb} KB</span>
      </button>

      {canDelete && (
        <button
          onClick={() => onDelete(attachment.id)}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 disabled:opacity-30 shrink-0"
          title="Eliminar adjunto"
        >
          {isDeleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ─── Attachment Panel ─────────────────────────────────────────────────────────
// Bug 3C: Panel ubicado en la columna izquierda (sidebar), debajo de "Detalles".

interface AttachmentPanelProps {
  attachments: MedicalRecordAttachment[];
  medicalRecordId: number;
  canUpload: boolean;
}

function AttachmentPanel({
  attachments,
  medicalRecordId,
  canUpload,
}: AttachmentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, isPending: isUploading } =
    useUploadAttachments(medicalRecordId);
  const {
    mutate: deleteAtt,
    isPending: isDeleting,
    variables: deletingId,
  } = useDeleteAttachment(medicalRecordId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      upload(files);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-1">
      {attachments.length === 0 ? (
        <p className="text-xs text-slate-400 py-1">
          {canUpload
            ? "Sin fotos. Usá el botón para adjuntar."
            : "Sin fotos adjuntas."}
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {attachments.map((att) => (
            <AttachmentLink
              key={att.id}
              attachment={att}
              medicalRecordId={medicalRecordId}
              canDelete={canUpload}
              onDelete={(id) => deleteAtt(id)}
              isDeleting={isDeleting && deletingId === att.id}
            />
          ))}
        </div>
      )}

      {/* Solo doctors pueden subir */}
      {canUpload && (
        <div className="pt-2">
          {/* NO setear Content-Type — el browser lo genera con el boundary */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-1.5 text-xs w-full"
          >
            {isUploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            {isUploading ? "Subiendo…" : "Agregar fotos"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Page Principal ───────────────────────────────────────────────────────────

function ReadOnlyMedicalRecordContent() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const isDoctor = hasRole("doctor");

  const patientId = Number(params.id);
  const recordId = Number(params.record_id);

  const { data: record, isLoading } = useQuery({
    queryKey: ["medical-record", recordId],
    queryFn: () => getMedicalRecord(recordId),
    enabled: !!recordId,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-64">
        <ClipboardList className="h-12 w-12 text-brand-300 mb-4" />
        <h2 className="text-xl font-bold text-foreground">
          Registro Médico no encontrado
        </h2>
        <p className="text-muted mt-2">
          El registro médico que intentás acceder no existe o no está
          disponible.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => router.push(`/patients/${patientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al paciente
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 p-2"
            onClick={() => router.push(`/patients/${patientId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al perfil
          </Button>
        </div>
        <div className="bg-success/10 text-success px-3 py-1 rounded-full text-xs font-semibold border border-success/20">
          Registro Finalizado
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Columna Izquierda (Sidebar) ── */}
        <div className="lg:col-span-1 space-y-4">
          {/* Detalles del Registro */}
          <Card className="border-brand-200 shadow-sm bg-surface-secondary/50">
            <CardHeader className="pb-3 border-b border-brand-100">
              <CardTitle className="text-sm font-semibold text-brand-800 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-brand-500" />
                Detalles del Registro
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4 space-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                  Fecha de la Evolución
                </span>
                <div className="flex items-center gap-2 font-semibold text-brand-900">
                  <Calendar className="w-4 h-4 text-brand-500" />
                  {formatLocalDate(record.date)}
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-brand-100">
                <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                  Paciente
                </span>
                <div className="flex items-center gap-2 font-medium text-brand-800">
                  <User className="w-4 h-4 text-brand-500" />
                  {record.patient?.full_name || "Desconocido"}
                </div>
              </div>

              <div className="space-y-1 pt-3 border-t border-brand-100">
                <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                  Profesional
                </span>
                <div className="flex items-center gap-2 font-medium text-brand-800">
                  <Stethoscope className="w-4 h-4 text-brand-500" />
                  {record.doctor ? `Dr. ${record.doctor.name}` : "Sistema"}
                </div>
              </div>

              {record.appointment?.service && (
                <div className="space-y-1 pt-3 border-t border-brand-100">
                  <span className="text-xs text-brand-400 font-medium uppercase tracking-wider">
                    Servicio Vinculado
                  </span>
                  <div className="font-medium text-brand-800">
                    {record.appointment.service.name}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Bug 3C: Panel de adjuntos en la columna izquierda */}
          <Card className="border-brand-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-brand-100">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-slate-500" />
                Archivos Adjuntos
                {(record.attachments?.length ?? 0) > 0 && (
                  <span className="ml-auto text-xs font-normal text-slate-500">
                    {record.attachments!.length}{" "}
                    {record.attachments!.length === 1 ? "archivo" : "archivos"}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardBody className="p-4">
              <AttachmentPanel
                attachments={record.attachments ?? []}
                medicalRecordId={record.id}
                canUpload={isDoctor}
              />
            </CardBody>
          </Card>
        </div>

        {/* ── Columna Derecha (Contenido Clínico) ── */}
        <div className="lg:col-span-2">
          <Card className="border-brand-200 shadow-sm h-full">
            <CardHeader className="border-b border-brand-100 bg-surface">
              <CardTitle className="text-lg font-bold text-brand-900 flex items-center gap-2">
                Evolución Médica
              </CardTitle>
            </CardHeader>
            <CardBody className="p-8 bg-surface min-h-[400px]">
              <div className="prose prose-sm max-w-none text-foreground leading-relaxed whitespace-pre-wrap">
                {record.content}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReadOnlyMedicalRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ReadOnlyMedicalRecordContent />
    </Suspense>
  );
}
