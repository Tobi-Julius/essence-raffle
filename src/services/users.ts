"use client";

import { collection, doc, getDoc, getDocs, limit as fsLimit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { converterFor } from "@/lib/firebase/converters";
import type { UserProfile, UserRole } from "@/types/firestore";
import type { ProfileUpdateInput } from "@/lib/validation/schemas";

const userConverter = converterFor<UserProfile>();
const usersCol = () => collection(db, "users").withConverter(userConverter);

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", userId).withConverter(userConverter));
  return snap.exists() ? snap.data() : null;
}

/**
 * Self-service profile edits. Firestore rules restrict this write to the
 * document owner AND to exactly these fields — `role` and `isActive` can
 * only change via the super-admin-only branch of the same rule (see
 * setUserRole/setUserActive below).
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

/**
 * Super-admin-only role change — replaces the removed setUserRole Cloud
 * Function. There is no Auth custom claim anymore; firestore.rules reads
 * this Firestore field directly (see myRole() in firestore.rules), so this
 * plain write IS the entire role-management mechanism now.
 */
export async function setUserRole(userId: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, "users", userId), { role, updatedAt: new Date() });
}

/**
 * Super-admin-only activation toggle — replaces the removed setUserActive
 * Cloud Function. Unlike the original, this cannot disable the user's
 * underlying Firebase Auth account (that requires the Admin SDK); a
 * deactivated user's existing ID token stays technically valid, but every
 * privileged Firestore rule also checks isActive, so they lose all
 * privileged access immediately regardless.
 */
export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  await updateDoc(doc(db, "users", userId), { isActive, updatedAt: new Date() });
}
