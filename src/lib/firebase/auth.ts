"use client";

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { RegisterInput } from "@/lib/validation/schemas";

/**
 * Registration creates the Firebase Auth user AND the Firestore profile
 * document that IS their role record (see firestore.rules' myRole()). The
 * role is always "participant" here, and firestore.rules' create rule
 * forces that — a client can never self-assign a role. Elevating a user to
 * admin/super_admin is exclusively done via setUserRole
 * (src/services/users.ts), super-admin only.
 */
export async function registerUser(input: RegisterInput): Promise<void> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    input.email,
    input.password,
  );

  await updateProfile(credential.user, {
    displayName: input.fullName,
  });
  await setDoc(doc(db, "users", credential.user.uid), {
    fullName: input.fullName,
    email: input.email,
    phoneNumber: input.phoneNumber,
    role: "participant",
    photoURL: null,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await sendEmailVerification(credential.user);
}

export async function loginUser(
  email: string,
  password: string,
): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) throw new Error("Not signed in");
  await sendEmailVerification(auth.currentUser);
}
