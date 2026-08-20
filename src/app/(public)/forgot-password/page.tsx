"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { requestPasswordReset } from "@/lib/firebase/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(parsed.data.email);
      setSent(true);
    } catch (err) {
      // Avoid confirming/denying whether an account exists for this email.
      setSent(true);
      void err;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Reset your password</h1>
      <p className="mt-1 text-sm text-neutral-500">We&apos;ll email you a link to reset it.</p>
      <Card className="mt-6">
        <CardBody>
          {sent ? (
            <Alert tone="success" title="Check your inbox">
              If an account exists for {email}, we&apos;ve sent a password reset link.
            </Alert>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={error ?? undefined} />
              <Button type="submit" className="w-full" loading={submitting}>
                Send reset link
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  );
}
