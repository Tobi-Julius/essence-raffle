"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
}

/** Shared confirmation pattern for destructive/irreversible admin actions
 * (cancel raffle, reject payment, disqualify winner, etc). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  requireReason = false,
  reasonLabel = "Reason",
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (requireReason && reason.trim().length < 3) {
      setError("Please provide a reason (at least 3 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(requireReason ? reason.trim() : undefined);
      setReason("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={typeof description === "string" ? description : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={handleConfirm} loading={submitting}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof description !== "string" && description}
      {requireReason && (
        <Textarea
          label={reasonLabel}
          required
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          error={error ?? undefined}
        />
      )}
      {!requireReason && error && <p className="text-sm text-error">{error}</p>}
    </Modal>
  );
}
