"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FileUpload } from "@/components/ui/FileUpload";
import { PageSpinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { prizeSchema } from "@/lib/validation/schemas";
import { upsertPrize, updatePrizeMedia } from "@/services/prizes";
import { uploadPrizeImage, uploadPrizeVideo } from "@/services/storage";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";

export default function AdminPrizePage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, prize, loading, refresh } = useAdminRaffle(params.raffleId);
  const { show } = useToast();
  const [form, setForm] = useState({ name: "", description: "", value: "", currency: "NGN" });
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageProgress, setImageProgress] = useState<number | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!initialized && prize) {
    setForm({
      name: prize.name,
      description: prize.description,
      value: prize.value ? String(prize.value) : "",
      currency: prize.currency ?? "NGN",
    });
    setInitialized(true);
  }

  if (loading) return <PageSpinner />;
  if (!raffle) return <Alert tone="error">Raffle not found.</Alert>;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = prizeSchema.safeParse({
      name: form.name,
      description: form.description,
      value: form.value ? Number(form.value) : null,
      currency: form.value ? form.currency : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await upsertPrize(raffle!.id, parsed.data);
      show("success", "Prize saved.");
      refresh();
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function ensurePrizeExists() {
    if (prize) return;
    await upsertPrize(raffle!.id, { name: form.name || "Prize", description: form.description || "" });
    refresh();
  }

  async function handleImage(file: File) {
    try {
      await ensurePrizeExists();
      const { done } = uploadPrizeImage(raffle!.id, file, setImageProgress);
      const { path, url } = await done;
      await updatePrizeMedia(raffle!.id, { imagePath: path, imageUrl: url });
      show("success", "Prize image updated.");
      refresh();
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setImageProgress(null);
    }
  }

  async function handleVideo(file: File) {
    try {
      await ensurePrizeExists();
      const { done } = uploadPrizeVideo(raffle!.id, file, setVideoProgress);
      const { path, url } = await done;
      await updatePrizeMedia(raffle!.id, { videoPath: path, videoUrl: url });
      show("success", "Prize video updated.");
      refresh();
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setVideoProgress(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>

      <div className="mt-6 grid max-w-4xl gap-6 sm:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-neutral-900">Prize details</h2>
            <p className="mt-1 text-sm text-neutral-500">Every raffle has exactly one prize and one winner.</p>
            <form className="mt-4 space-y-4" onSubmit={handleSave}>
              {error && <Alert tone="error">{error}</Alert>}
              <Input label="Prize name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Textarea label="Description" required rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Value (optional)" type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
                <Input label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
              </div>
              <Button type="submit" loading={saving}>
                Save prize
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-5">
            <div>
              <h2 className="font-semibold text-neutral-900">Prize image</h2>
              {prize?.imageUrl && (
                <div className="relative mb-3 mt-2 h-40 w-full overflow-hidden rounded-xl">
                  <Image src={prize.imageUrl} alt="" fill className="object-cover" />
                </div>
              )}
              <FileUpload
                label={prize?.imageUrl ? "Replace image" : "Upload image"}
                hint="JPG, PNG, or WEBP — up to 5MB"
                accept="image/jpeg,image/png,image/webp"
                onSelect={handleImage}
                progress={imageProgress}
              />
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Prize video</h2>
              {prize?.videoUrl && (
                <video src={prize.videoUrl} controls className="mb-3 mt-2 w-full rounded-xl" />
              )}
              <FileUpload
                label={prize?.videoUrl ? "Replace video" : "Upload video"}
                hint="MP4, WEBM, or MOV — up to 50MB"
                accept="video/mp4,video/webm,video/quicktime"
                onSelect={handleVideo}
                progress={videoProgress}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
