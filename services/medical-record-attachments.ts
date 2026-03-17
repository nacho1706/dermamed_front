import api from "@/lib/api";
import type { MedicalRecordAttachment } from "@/types";

// ─── Upload Attachments ──────────────────────────────────────────────────────

/**
 * Subir imágenes adjuntas a un registro médico.
 * CRÍTICO: NO setear Content-Type manualmente. FormData necesita
 * que el browser genere el boundary del multipart automáticamente.
 */
export async function uploadAttachments(
  medicalRecordId: number,
  files: File[],
): Promise<MedicalRecordAttachment[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append("attachments[]", file));

  const response = await api.post<{
    success: boolean;
    message: string;
    attachments: MedicalRecordAttachment[];
  }>(`/medical-records/${medicalRecordId}/attachments`, formData, {
    // Eliminar Content-Type del header para que Axios/browser
    // lo genere automáticamente con el boundary correcto
    headers: { "Content-Type": undefined },
  });

  return response.data.attachments;
}

// ─── Fetch Attachment as Blob (para renderizado inline) ──────────────────────

/**
 * Descarga un adjunto como Blob usando el interceptor JWT de Axios.
 * Retorna un Object URL que puede usarse directamente en <img src=...>.
 * IMPORTANTE: Llamar URL.revokeObjectURL(url) cuando el componente se desmonte.
 */
export async function fetchAttachmentAsObjectUrl(
  medicalRecordId: number,
  attachmentId: number,
): Promise<string> {
  const response = await api.get(
    `/medical-records/${medicalRecordId}/attachments/${attachmentId}`,
    { responseType: "blob" },
  );
  return URL.createObjectURL(response.data as Blob);
}

// ─── Delete Attachment ───────────────────────────────────────────────────────

export async function deleteAttachment(
  medicalRecordId: number,
  attachmentId: number,
): Promise<void> {
  await api.delete(
    `/medical-records/${medicalRecordId}/attachments/${attachmentId}`,
  );
}
