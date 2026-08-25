"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { prizeSchema } from "@/lib/validation/schemas";
import { upsertPrize, updatePrizeMedia } from "@/services/prizes";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";

export default function AdminPrizePage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, prize, loading, refresh } = useAdminRaffle(params.raffleId);
  const { show } = useToast();
  const [form, setForm] = useState({ name: "", description: "", value: "", currency: "NGN" });
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [savingImage, setSavingImage] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
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

  async function handleImage() {
    if (!imageUrl.trim()) return;
    setSavingImage(true);
    try {
      await ensurePrizeExists();
      await updatePrizeMedia(raffle!.id, { imageUrl: imageUrl.trim() });
      show("success", "Prize image updated.");
      setImageUrl("");
      refresh();
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setSavingImage(false);
    }
  }

  async function handleVideo() {
    if (!videoUrl.trim()) return;
    setSavingVideo(true);
    try {
      await ensurePrizeExists();
      await updatePrizeMedia(raffle!.id, { videoUrl: videoUrl.trim() });
      show("success", "Prize video updated.");
      setVideoUrl("");
      refresh();
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setSavingVideo(false);
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
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Image URL"
                    placeholder="https://…"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleImage} loading={savingImage} disabled={!imageUrl.trim()}>
                  Save
                </Button>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-neutral-900">Prize video</h2>
              {prize?.videoUrl && (
                <video src={prize.videoUrl} controls className="mb-3 mt-2 w-full rounded-xl" />
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Video URL"
                    placeholder="https://…"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                  />
                </div>
                <Button onClick={handleVideo} loading={savingVideo} disabled={!videoUrl.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
