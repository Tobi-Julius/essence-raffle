"use client";

import { useEffect, useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { profileUpdateSchema } from "@/lib/validation/schemas";
import { updateMyProfile } from "@/services/users";
import { resendVerificationEmail } from "@/lib/firebase/auth";
import { toFriendlyError } from "@/lib/errors";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { user, profile, emailVerified, loading } = useAuth();
  const [form, setForm] = useState({ fullName: "", phoneNumber: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    if (profile) setForm({ fullName: profile.fullName, phoneNumber: profile.phoneNumber });
  }, [profile]);

  if (loading || !profile || !user) return <PageSpinner />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = profileUpdateSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateMyProfile(user!.uid, parsed.data);
      show("success", "Profile updated.");
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-neutral-900">Profile</h1>
      <p className="mt-1 text-sm text-neutral-500">Manage your contact information.</p>

      {!emailVerified && (
        <div className="mt-6">
          <Alert tone="warning" title="Verify your email">
            <div className="flex flex-wrap items-center gap-3">
              <span>We sent a verification link to {profile.email}.</span>
              <Button
                size="sm"
                variant="outline"
                loading={resending}
                onClick={async () => {
                  setResending(true);
                  try {
                    await resendVerificationEmail();
                    show("success", "Verification email resent.");
                  } catch (err) {
                    show("error", toFriendlyError(err));
                  } finally {
                    setResending(false);
                  }
                }}
              >
                Resend email
              </Button>
            </div>
          </Alert>
        </div>
      )}

      <Card className="mt-6">
        <CardBody>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <Input label="Email" value={profile.email} disabled readOnly hint="Contact support to change your email." />
            <Input
              label="Full name"
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              error={errors.fullName}
            />
            <Input
              label="Phone number"
              type="tel"
              required
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              error={errors.phoneNumber}
            />
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
