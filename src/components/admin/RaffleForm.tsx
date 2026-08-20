"use client";

import { useState } from "react";
import { Input, Select, Textarea, Checkbox } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { raffleCreateSchema, type RaffleCreateInput } from "@/lib/validation/schemas";
import { ELIGIBILITY_TYPES } from "@/types/firestore";

export interface RaffleFormValues {
  name: string;
  shortDescription: string;
  fullDescription: string;
  timezone: string;
  registrationStart: string; // datetime-local string
  registrationEnd: string;
  drawAt: string;
  entryFee: string;
  currency: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  eligibilityType: (typeof ELIGIBILITY_TYPES)[number];
  eligibilityGroupLabel: string;
  eligibilityDescription: string;
  allowMultipleEntries: boolean;
  maxEntriesPerUser: string;
}

export const emptyRaffleForm: RaffleFormValues = {
  name: "",
  shortDescription: "",
  fullDescription: "",
  timezone: "Africa/Lagos",
  registrationStart: "",
  registrationEnd: "",
  drawAt: "",
  entryFee: "",
  currency: "NGN",
  bankName: "",
  accountName: "",
  accountNumber: "",
  instructions: "",
  eligibilityType: "everyone",
  eligibilityGroupLabel: "",
  eligibilityDescription: "",
  allowMultipleEntries: false,
  maxEntriesPerUser: "1",
};

function toInput(values: RaffleFormValues): RaffleCreateInput | null {
  try {
    return raffleCreateSchema.parse({
      basicInfo: {
        name: values.name,
        shortDescription: values.shortDescription,
        fullDescription: values.fullDescription,
      },
      schedule: {
        timezone: values.timezone,
        registrationStart: new Date(values.registrationStart),
        registrationEnd: new Date(values.registrationEnd),
        drawAt: new Date(values.drawAt),
      },
      payment: {
        entryFee: Number(values.entryFee),
        currency: values.currency,
        bankName: values.bankName,
        accountName: values.accountName,
        accountNumber: values.accountNumber,
        instructions: values.instructions,
      },
      eligibility: {
        type: values.eligibilityType,
        groupLabel: values.eligibilityGroupLabel || undefined,
        description: values.eligibilityDescription,
      },
      entryConfig: {
        allowMultipleEntries: values.allowMultipleEntries,
        maxEntriesPerUser: values.allowMultipleEntries ? Number(values.maxEntriesPerUser) : 1,
      },
    });
  } catch {
    return null;
  }
}

export function RaffleForm({
  initial,
  onSubmit,
  submitLabel = "Save raffle",
  disabled = false,
}: {
  initial: RaffleFormValues;
  onSubmit: (input: RaffleCreateInput) => Promise<void>;
  submitLabel?: string;
  disabled?: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof RaffleFormValues>(key: K, value: RaffleFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = toInput(values);
    if (!parsed) {
      setError("Check the form for errors — all required fields must be valid.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && <Alert tone="error">{error}</Alert>}

      <Section title="Basic information">
        <Input label="Raffle name" required value={values.name} onChange={(e) => set("name", e.target.value)} disabled={disabled} />
        <Textarea
          label="Short description"
          hint="Shown on raffle cards. Keep it under 280 characters."
          required
          rows={2}
          value={values.shortDescription}
          onChange={(e) => set("shortDescription", e.target.value)}
          disabled={disabled}
        />
        <Textarea
          label="Full description"
          required
          rows={6}
          value={values.fullDescription}
          onChange={(e) => set("fullDescription", e.target.value)}
          disabled={disabled}
        />
      </Section>

      <Section title="Schedule">
        <Input
          label="Timezone"
          hint="IANA timezone, e.g. Africa/Lagos. The backend uses this to authoritatively decide when the raffle opens and closes."
          required
          value={values.timezone}
          onChange={(e) => set("timezone", e.target.value)}
          disabled={disabled}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Registration start" type="datetime-local" required value={values.registrationStart} onChange={(e) => set("registrationStart", e.target.value)} disabled={disabled} />
          <Input label="Registration end" type="datetime-local" required value={values.registrationEnd} onChange={(e) => set("registrationEnd", e.target.value)} disabled={disabled} />
          <Input label="Draw date & time" type="datetime-local" required value={values.drawAt} onChange={(e) => set("drawAt", e.target.value)} disabled={disabled} />
        </div>
      </Section>

      <Section title="Payment">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Entry fee (whole Naira)" type="number" min={1} required value={values.entryFee} onChange={(e) => set("entryFee", e.target.value)} disabled={disabled} />
          <Input label="Currency" required value={values.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} disabled={disabled} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Bank name" required value={values.bankName} onChange={(e) => set("bankName", e.target.value)} disabled={disabled} />
          <Input label="Account name" required value={values.accountName} onChange={(e) => set("accountName", e.target.value)} disabled={disabled} />
        </div>
        <Input label="Account number" required value={values.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} disabled={disabled} />
        <Textarea label="Payment instructions" rows={3} value={values.instructions} onChange={(e) => set("instructions", e.target.value)} disabled={disabled} />
      </Section>

      <Section title="Eligibility">
        <Select label="Who can enter" required value={values.eligibilityType} onChange={(e) => set("eligibilityType", e.target.value as RaffleFormValues["eligibilityType"])} disabled={disabled}>
          <option value="everyone">Everyone</option>
          <option value="employees_only">Employees only</option>
          <option value="customers_only">Customers only</option>
          <option value="specific_group">Specific group</option>
        </Select>
        {values.eligibilityType === "specific_group" && (
          <Input label="Group label" value={values.eligibilityGroupLabel} onChange={(e) => set("eligibilityGroupLabel", e.target.value)} disabled={disabled} />
        )}
        <Textarea label="Eligibility notes (shown to participants)" rows={2} value={values.eligibilityDescription} onChange={(e) => set("eligibilityDescription", e.target.value)} disabled={disabled} />
      </Section>

      <Section title="Entries">
        <Checkbox
          label="Allow multiple entries per participant"
          checked={values.allowMultipleEntries}
          onChange={(e) => set("allowMultipleEntries", e.target.checked)}
          disabled={disabled}
        />
        {values.allowMultipleEntries && (
          <Input
            label="Maximum entries per participant"
            type="number"
            min={1}
            max={100}
            required
            value={values.maxEntriesPerUser}
            onChange={(e) => set("maxEntriesPerUser", e.target.value)}
            disabled={disabled}
          />
        )}
      </Section>

      <Button type="submit" loading={submitting} disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-neutral-200 p-5">
      <h2 className="font-semibold text-neutral-900">{title}</h2>
      {children}
    </div>
  );
}

export { toInput as parseRaffleFormValues };
