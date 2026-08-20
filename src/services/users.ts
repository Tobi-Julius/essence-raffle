"use client";

import { collection, doc, getDoc, getDocs, limit as fsLimit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import type { UserProfile } from "@/types/firestore";
import type { ProfileUpdateInput } from "@/lib/validation/schemas";

const userConverter = converterFor<UserProfile>();
const usersCol = () => collection(db, "users").withConverter(userConverter);

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", userId).withConverter(userConverter));
  return snap.exists() ? snap.data() : null;
}

/**
 * Self-service profile edits. Firestore rules restrict this write to the
 * document owner AND to exactly these fields — `role` and `isActive` are
 * immutable from the client and can only change via the `setUserRole` /
 * `setUserActive` Cloud Function callables (super-admin only).
 */
export async function updateMyProfile(userId: string, input: ProfileUpdateInput): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    fullName: input.fullName,
    phoneNumber: input.phoneNumber,
    updatedAt: new Date(),
  });
}

export async function listAllUsers(): Promise<UserProfile[]> {
  const q = query(usersCol(), orderBy("createdAt", "desc"), fsLimit(200));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function searchUsersByEmail(term: string): Promise<UserProfile[]> {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];
  const q = query(
    usersCol(),
    orderBy("email"),
    where("email", ">=", normalized),
    where("email", "<=", normalized + "\uf8ff"),
    fsLimit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}
