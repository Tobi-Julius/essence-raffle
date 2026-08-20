"use client";

import { getDownloadURL, ref, uploadBytesResumable, type UploadTaskSnapshot } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { ACCEPTED_RECEIPT_MIME_TYPES, MAX_RECEIPT_SIZE_BYTES } from "@/lib/validation/schemas";

export class FileValidationError extends Error {}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

export function validateReceiptFile(file: File): void {
  if (!ACCEPTED_RECEIPT_MIME_TYPES.includes(file.type as (typeof ACCEPTED_RECEIPT_MIME_TYPES)[number])) {
    throw new FileValidationError("Upload a JPG, PNG, or PDF file.");
  }
  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    throw new FileValidationError("File is too large. Maximum size is 8MB.");
  }
}

/**
 * Uploads a payment receipt to a path the Storage rules constrain to this
 * exact (raffleId, userId, paymentId) tuple — a user cannot upload into
 * another user's or another raffle's path. Storage rules independently
 * re-validate content type and size; client validation here is UX only.
 */
export function uploadReceipt(
  raffleId: string,
  userId: string,
  paymentId: string,
  file: File,
  onProgress?: (pct: number) => void,
): { path: string; task: ReturnType<typeof uploadBytesResumable>; done: Promise<string> } {
  validateReceiptFile(file);
  const ext = extensionFor(file.type);
  const path = `receipts/${raffleId}/${userId}/${paymentId}/receipt.${ext}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
  const done = new Promise<string>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap: UploadTaskSnapshot) => {
        onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      reject,
      async () => resolve(path),
    );
  });
  return { path, task, done };
}

/**
 * Resolves a short-lived download URL for a receipt at the given Storage
 * path. Storage rules only grant read access to the uploading participant
 * and admins of the platform — an arbitrary user calling this for someone
 * else's receipt path is rejected server-side by Storage rules, not by
 * anything in this function.
 */
export async function getReceiptUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function uploadRaffleBanner(raffleId: string, file: File, onProgress?: (pct: number) => void) {
  if (!IMAGE_TYPES.includes(file.type)) throw new FileValidationError("Upload a JPG, PNG, or WEBP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new FileValidationError("Image is too large. Maximum size is 5MB.");
  return uploadAdminAsset(`raffles/${raffleId}/banner`, file, onProgress);
}

export function uploadPrizeImage(raffleId: string, file: File, onProgress?: (pct: number) => void) {
  if (!IMAGE_TYPES.includes(file.type)) throw new FileValidationError("Upload a JPG, PNG, or WEBP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new FileValidationError("Image is too large. Maximum size is 5MB.");
  return uploadAdminAsset(`prizes/${raffleId}/image`, file, onProgress);
}

export function uploadPrizeVideo(raffleId: string, file: File, onProgress?: (pct: number) => void) {
  if (!VIDEO_TYPES.includes(file.type)) throw new FileValidationError("Upload an MP4, WEBM, or MOV video.");
  if (file.size > MAX_VIDEO_BYTES) throw new FileValidationError("Video is too large. Maximum size is 50MB.");
  return uploadAdminAsset(`prizes/${raffleId}/video`, file, onProgress);
}

function uploadAdminAsset(basePath: string, file: File, onProgress?: (pct: number) => void) {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${basePath}.${ext}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
  const done = new Promise<{ path: string; url: string }>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap: UploadTaskSnapshot) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => resolve({ path, url: await getDownloadURL(storageRef) }),
    );
  });
  return { path, task, done };
}
