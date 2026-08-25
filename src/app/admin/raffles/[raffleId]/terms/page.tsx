"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { JSONContent } from "@tiptap/react";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link2 from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { RaffleSubNav } from "@/components/admin/RaffleSubNav";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAdminRaffle } from "@/hooks/useAdminRaffle";
import { createDraftTerms, listTermsVersions, publishTerms, updateDraftTerms } from "@/services/terms";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";
import type { RaffleTerms } from "@/types/firestore";
import { formatDateTime } from "@/lib/utils/dates";

const DEFAULT_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

export default function AdminTermsPage() {
  const params = useParams<{ raffleId: string }>();
  const { raffle, loading } = useAdminRaffle(params.raffleId);
  const { user, role } = useAuth();
  const { show } = useToast();
  const [versions, setVersions] = useState<RaffleTerms[] | null>(null);
  const [draft, setDraft] = useState<JSONContent>(DEFAULT_DOC);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [html, setHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  async function refresh() {
    const list = await listTermsVersions(params.raffleId);
    setVersions(list);
    const existingDraft = list.find((t) => t.status === "draft");
    if (existingDraft) {
      setDraftId(existingDraft.id);
      setDraft(existingDraft.contentJson as JSONContent);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.raffleId]);

  if (loading || !raffle) return <PageSpinner />;

  async function handleSaveDraft() {
    if (!user) return;
    setSaving(true);
    try {
      const computedHtml =
        html ||
        generateHTML(draft, [StarterKit.configure({ heading: { levels: [2, 3] } }), Underline, Link2]);
      if (draftId) {
        await updateDraftTerms(raffle!.id, draftId, { contentJson: draft, contentHtml: computedHtml });
      } else {
        const id = await createDraftTerms(raffle!.id, { contentJson: draft, contentHtml: computedHtml }, user.uid);
        setDraftId(id);
      }
      show("success", "Draft terms saved.");
      refresh();
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!draftId || !user || !role) return;
    setPublishing(true);
    try {
      await publishTerms(raffle!.id, draftId, user.uid, role);
      show("success", "Terms published as the active version.");
      setDraftId(null);
      setDraft(DEFAULT_DOC);
      refresh();
    } catch (err) {
      show("error", toFriendlyError(err));
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">{raffle.name}</h1>
      <div className="mt-6">
        <RaffleSubNav raffleId={raffle.id} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Alert tone="info">
            Terms are versioned. Publishing archives the previous active version — participants who already accepted
            it keep that exact version on their entry record.
          </Alert>
          <RichTextEditor content={draft} onChange={(json, h) => { setDraft(json); setHtml(h); }} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSaveDraft} loading={saving}>
              Save draft
            </Button>
            <Button onClick={handlePublish} loading={publishing} disabled={!draftId}>
              Publish as active version
            </Button>
          </div>
        </div>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-neutral-900">Version history</h2>
            {versions === null ? (
              <p className="mt-2 text-sm text-neutral-400">Loading…</p>
            ) : versions.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-400">No versions yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-700">
                      v{v.version} · {formatDateTime(v.createdAt)}
                    </span>
                    <Badge tone={v.status === "active" ? "success" : v.status === "draft" ? "warning" : "neutral"}>
                      {v.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
