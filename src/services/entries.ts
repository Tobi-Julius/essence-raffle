"use client";

import {
  collection,
  getCountFromServer,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import type { EntryStatus, RaffleEntry } from "@/types/firestore";

const entryConverter = converterFor<RaffleEntry>();
const entriesCol = () => collection(db, "entries").withConverter(entryConverter);

export async function listMyEntries(userId: string): Promise<RaffleEntry[]> {
  const q = query(entriesCol(), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function listMyEntriesForRaffle(userId: string, raffleId: string): Promise<RaffleEntry[]> {
  const q = query(
    entriesCol(),
    where("userId", "==", userId),
    where("raffleId", "==", raffleId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export interface EntriesPage {
  entries: RaffleEntry[];
  cursor: QueryDocumentSnapshot<RaffleEntry> | null;
}

export async function listEntriesForRaffle(
  raffleId: string,
  opts: { status?: EntryStatus; pageSize?: number; cursor?: QueryDocumentSnapshot<RaffleEntry> | null } = {},
): Promise<EntriesPage> {
  const pageSize = opts.pageSize ?? 25;
  const clauses: QueryConstraint[] = [where("raffleId", "==", raffleId)];
  if (opts.status) clauses.push(where("status", "==", opts.status));
  const q = query(entriesCol(), ...clauses, orderBy("sequence", "asc"), fsLimit(pageSize), ...(opts.cursor ? [startAfter(opts.cursor)] : []));
  const snap = await getDocs(q);
  return {
    entries: snap.docs.map((d) => d.data()),
    cursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function countEligibleEntries(raffleId: string): Promise<number> {
  const q = query(entriesCol(), where("raffleId", "==", raffleId), where("status", "==", "eligible"));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
