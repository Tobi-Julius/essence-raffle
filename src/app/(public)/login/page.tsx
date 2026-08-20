"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { loginSchema } from "@/lib/validation/schemas";
import { loginUser } from "@/lib/firebase/auth";
import { toFriendlyError } from "@/lib/errors";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await loginUser(parsed.data.email, parsed.data.password);
      router.push(redirect);
    } catch (err) {
      setFormError(toFriendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Welcome back</h1>
      <p className="mt-1 text-sm text-neutral-500">Log in to track your raffle entries.</p>
      <Card className="mt-6">
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            {formError && <Alert tone="error">{formError}</Alert>}
            <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
            <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full" loading={submitting}>
              Log in
            </Button>
          </form>
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-sm text-neutral-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
