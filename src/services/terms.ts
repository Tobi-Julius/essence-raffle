"use client";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import type { RaffleTerms } from "@/types/firestore";
import type { TermsContentInput } from "@/lib/validation/schemas";

const termsConverter = converterFor<RaffleTerms>();
const termsCol = (raffleId: string) =>
  collection(db, "raffles", raffleId, "terms").withConverter(termsConverter);
const termsDoc = (raffleId: string, termsId: string) =>
  doc(db, "raffles", raffleId, "terms", termsId).withConverter(termsConverter);

export async function getActiveTerms(raffleId: string): Promise<RaffleTerms | null> {
  const q = query(termsCol(raffleId), where("status", "==", "active"));
  const snap = await getDocs(q);
  return snap.empty ? null : snap.docs[0].data();
}

export async function getTermsById(raffleId: string, termsId: string): Promise<RaffleTerms | null> {
  const snap = await getDoc(termsDoc(raffleId, termsId));
  return snap.exists() ? snap.data() : null;
}

export async function listTermsVersions(raffleId: string): Promise<RaffleTerms[]> {
  const q = query(termsCol(raffleId), orderBy("version", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export function watchActiveTerms(raffleId: string, cb: (terms: RaffleTerms | null) => void): () => void {
  const q = query(termsCol(raffleId), where("status", "==", "active"));
  return onSnapshot(
    q,
    (snap) => cb(snap.empty ? null : snap.docs[0].data()),
    (error) => {
      logSnapshotError(`raffles/${raffleId}/terms`, error);
      cb(null);
    },
  );
}

/**
 * Creates a new DRAFT terms version. The next version number is derived from
 * existing versions. Draft terms are never shown to participants and never
 * overwrite a previously-active (accepted) version — publishing is a
 * separate, server-validated step (see services/callables.ts#publishTerms)
 * that archives the prior active version atomically.
 */
export async function createDraftTerms(
  raffleId: string,
  content: TermsContentInput,
  createdBy: string,
): Promise<string> {
  const existing = await listTermsVersions(raffleId);
  const nextVersion = existing.length ? existing[0].version + 1 : 1;
  const ref = await addDoc(collection(db, "raffles", raffleId, "terms"), {
    raffleId,
    version: nextVersion,
    contentJson: content.contentJson,
    contentHtml: content.contentHtml,
    status: "draft",
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } as Omit<RaffleTerms, "id">);
  return ref.id;
}

/** Draft-only edits. Once a version is active/archived it is immutable. */
export async function updateDraftTerms(
  raffleId: string,
  termsId: string,
  content: TermsContentInput,
): Promise<void> {
  await updateDoc(termsDoc(raffleId, termsId), {
    contentJson: content.contentJson,
    contentHtml: content.contentHtml,
    updatedAt: serverTimestamp(),
  });
}
