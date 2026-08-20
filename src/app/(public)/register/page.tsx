"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { registerSchema } from "@/lib/validation/schemas";
import { registerUser } from "@/lib/firebase/auth";
import { toFriendlyError } from "@/lib/errors";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await registerUser(parsed.data);
      router.push("/dashboard?welcome=1");
    } catch (err) {
      setFormError(toFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Create your account</h1>
      <p className="mt-1 text-sm text-neutral-500">Register to enter Essence Store raffles.</p>
      <Card className="mt-6">
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {formError && <Alert tone="error">{formError}</Alert>}
            <Input
              label="Full name"
              autoComplete="name"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              error={errors.fullName}
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={errors.email}
            />
            <Input
              label="Phone number"
              type="tel"
              autoComplete="tel"
              required
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              error={errors.phoneNumber}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="new-password"
              required
              hint="At least 8 characters, with an uppercase letter and a number."
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              error={errors.password}
            />
            <Button type="submit" className="w-full" loading={submitting}>
              Create account
            </Button>
          </form>
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
