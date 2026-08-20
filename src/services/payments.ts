"use client";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import { logSnapshotError } from "@/lib/firebase/snapshot";
import type { Payment, PaymentStatus } from "@/types/firestore";

const paymentConverter = converterFor<Payment>();
const paymentsCol = () => collection(db, "payments").withConverter(paymentConverter);

export async function getPayment(paymentId: string): Promise<Payment | null> {
  const snap = await getDoc(doc(db, "payments", paymentId).withConverter(paymentConverter));
  return snap.exists() ? snap.data() : null;
}

export function watchPayment(paymentId: string, cb: (payment: Payment | null) => void): () => void {
  return onSnapshot(
    doc(db, "payments", paymentId).withConverter(paymentConverter),
    (snap) => cb(snap.exists() ? snap.data() : null),
    (error) => {
      logSnapshotError(`payments/${paymentId}`, error);
      cb(null);
    },
  );
}

export async function listMyPayments(userId: string): Promise<Payment[]> {
  const q = query(paymentsCol(), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export interface PaymentsPage {
  payments: Payment[];
  cursor: QueryDocumentSnapshot<Payment> | null;
}

export async function listPaymentsForQueue(
  opts: {
    raffleId?: string;
    status?: PaymentStatus | "all";
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<Payment> | null;
  } = {},
): Promise<PaymentsPage> {
  const pageSize = opts.pageSize ?? 25;
  const clauses: QueryConstraint[] = [];
  if (opts.raffleId) clauses.push(where("raffleId", "==", opts.raffleId));
  if (opts.status && opts.status !== "all") clauses.push(where("status", "==", opts.status));
  const q = query(
    paymentsCol(),
    ...clauses,
    orderBy("createdAt", "desc"),
    fsLimit(pageSize),
    ...(opts.cursor ? [startAfter(opts.cursor)] : []),
  );
  const snap = await getDocs(q);
  return {
    payments: snap.docs.map((d) => d.data()),
    cursor: snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null,
  };
}
