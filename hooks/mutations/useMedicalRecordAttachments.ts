import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  uploadAttachments,
  deleteAttachment,
} from "@/services/medical-record-attachments";

// ─── Upload ──────────────────────────────────────────────────────────────────

export function useUploadAttachments(medicalRecordId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadAttachments(medicalRecordId, files),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["medical-record", medicalRecordId],
      });
      toast.success("Imágenes adjuntadas correctamente.");
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.errors?.["attachments.0"]?.[0] ||
        error?.response?.data?.message ||
        "Error al subir las imágenes.";
      toast.error(message);
    },
  });
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export function useDeleteAttachment(medicalRecordId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      deleteAttachment(medicalRecordId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["medical-record", medicalRecordId],
      });
      toast.success("Adjunto eliminado.");
    },
    onError: () => {
      toast.error("No se pudo eliminar el adjunto.");
    },
  });
}
