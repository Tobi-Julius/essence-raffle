"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import type { Raffle, RaffleListSection } from "@/types/firestore";
import type { RaffleCreateInput } from "@/lib/validation/schemas";

const raffleConverter = converterFor<Raffle>();
const raffleCol = () => collection(db, "raffles").withConverter(raffleConverter);
const raffleDocRef = (id: string) => doc(db, "raffles", id).withConverter(raffleConverter);

export async function getRaffle(id: string): Promise<Raffle | null> {
  const snap = await getDoc(raffleDocRef(id));
  return snap.exists() ? snap.data() : null;
}

export interface RafflePage {
  raffles: Raffle[];
  cursor: QueryDocumentSnapshot<Raffle> | null;
}

/**
 * Sections map to raffle status per the spec:
 * - present   -> OPEN
 * - upcoming  -> UPCOMING (and DRAFT is never shown publicly)
 * - completed -> COMPLETED (DRAWING is treated as "present, drawing soon")
 */
export async function listRafflesBySection(
  section: RaffleListSection,
  opts: { pageSize?: number; cursor?: QueryDocumentSnapshot<Raffle> | null } = {},
): Promise<RafflePage> {
  const pageSize = opts.pageSize ?? 12;
  const statuses = section === "present" ? ["OPEN", "DRAWING"] : section === "upcoming" ? ["UPCOMING"] : ["COMPLETED"];
  const orderField = section === "completed" ? "schedule.drawAt" : "schedule.registrationEnd";
  const clauses: QueryConstraint[] = [
    where("status", "in", statuses),
    orderBy(orderField, section === "completed" ? "desc" : "asc"),
    fsLimit(pageSize),
  ];
  if (opts.cursor) clauses.push(startAfter(opts.cursor));
  const q = query(raffleCol(), ...clauses);
  const snap = await getDocs(q);
  return {
    raffles: snap.docs.map((d) => d.data()),
    cursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function searchRafflesByName(term: string): Promise<Raffle[]> {
  // Firestore doesn't support full-text search; this does a prefix match on
  // a lowercase name field, sufficient for a raffle catalog of this size.
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];
  const q = query(
    raffleCol(),
    orderBy("nameLower"),
    where("nameLower", ">=", normalized),
    where("nameLower", "<=", normalized + "\uf8ff"),
    fsLimit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function listAllRafflesForAdmin(): Promise<Raffle[]> {
  const q = query(raffleCol(), orderBy("createdAt", "desc"), fsLimit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

function toTimestamp(d: Date): Timestamp {
  return Timestamp.fromDate(d);
}

/**
 * Content-level create/edit of a raffle (name, dates, payment info, etc).
 * Guarded by Firestore rules: admin-only, and only while status is DRAFT or
 * UPCOMING. Status transitions themselves (publish/cancel) go through Cloud
 * Function callables, not this path.
 */
export async function createDraftRaffle(input: RaffleCreateInput, createdBy: string): Promise<string> {
  const ref = await addDoc(collection(db, "raffles"), {
    name: input.basicInfo.name,
    nameLower: input.basicInfo.name.toLowerCase(),
    slug: slugify(input.basicInfo.name),
    shortDescription: input.basicInfo.shortDescription,
    fullDescription: input.basicInfo.fullDescription,
    bannerPath: null,
    bannerUrl: null,
    thumbnailPath: null,
    thumbnailUrl: null,
    status: "DRAFT",
    schedule: {
      timezone: input.schedule.timezone,
      registrationStart: toTimestamp(input.schedule.registrationStart),
      registrationEnd: toTimestamp(input.schedule.registrationEnd),
      drawAt: toTimestamp(input.schedule.drawAt),
    },
    payment: input.payment,
    eligibility: input.eligibility,
    entryConfig: input.entryConfig,
    activeTermsId: null,
    activeTermsVersion: null,
    hasWinner: false,
    currentWinnerEntryId: null,
    stats: {
      totalRegistrations: 0,
      paymentsPending: 0,
      paymentsApproved: 0,
      paymentsRejected: 0,
      eligibleEntries: 0,
      disqualifiedEntries: 0,
    },
    createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDraftRaffle(
  raffleId: string,
  input: Partial<RaffleCreateInput>,
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.basicInfo) {
    payload.name = input.basicInfo.name;
    payload.nameLower = input.basicInfo.name.toLowerCase();
    payload.slug = slugify(input.basicInfo.name);
    payload.shortDescription = input.basicInfo.shortDescription;
    payload.fullDescription = input.basicInfo.fullDescription;
  }
  if (input.schedule) {
    payload.schedule = {
      timezone: input.schedule.timezone,
      registrationStart: toTimestamp(input.schedule.registrationStart),
      registrationEnd: toTimestamp(input.schedule.registrationEnd),
      drawAt: toTimestamp(input.schedule.drawAt),
    };
  }
  if (input.payment) payload.payment = input.payment;
  if (input.eligibility) payload.eligibility = input.eligibility;
  if (input.entryConfig) payload.entryConfig = input.entryConfig;
  await updateDoc(doc(db, "raffles", raffleId), payload);
}

export async function updateRaffleMedia(
  raffleId: string,
  media: { bannerPath?: string; bannerUrl?: string; thumbnailPath?: string; thumbnailUrl?: string },
): Promise<void> {
  await updateDoc(doc(db, "raffles", raffleId), { ...media, updatedAt: serverTimestamp() });
}

export async function deleteDraftRaffle(raffleId: string): Promise<void> {
  await deleteDoc(doc(db, "raffles", raffleId));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
