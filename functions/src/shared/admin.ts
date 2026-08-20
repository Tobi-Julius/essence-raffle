import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

if (!getApps().length) {
  initializeApp();
}

export const db = getFirestore();
export const authAdmin = getAuth();
export const storageAdmin = getStorage();
export { Timestamp, FieldValue };
