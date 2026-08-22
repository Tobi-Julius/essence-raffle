/**
 * One-off bootstrap script — creates (or promotes) a single user to
 * `super_admin` directly against a REAL Firebase project, using the Admin
 * SDK. This is the only way to mint the very first admin: `setUserRole`
 * (functions/src/admin/setUserRole.ts) requires an existing super_admin to
 * call it, and Firestore rules force client-side registration to
 * `role: "participant"` (firestore.rules), so there's no in-app path to
 * create the first one.
 *
 * Sets BOTH the Firebase Auth custom claim (what security rules check) and
 * the mirrored Firestore `users/{uid}.role` field (what the UI reads), the
 * same two writes `setUserRole` performs — so the account works exactly
 * like any other admin from that point on.
 *
 * SAFETY: refuses to run unless you pass --project matching the target
 * project id, so you can't fat-finger this against the wrong environment.
 *
 * Setup:
 *   1. Firebase Console -> Project settings -> Service accounts ->
 *      "Generate new private key". Save the JSON somewhere outside the repo
 *      (or as service-account.json, which is gitignored).
 *   2. export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *
 * Usage:
 *   pnpm tsx scripts/bootstrap-admin.ts \
 *     --project essence-store-26966 \
 *     --email you@example.com \
 *     --password "TempPassw0rd!" \
 *     --name "Your Name"
 *
 * Change the password on first login — this script sets it in plaintext on
 * the command line, which shell history will remember.
 */
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const i = process.argv.indexOf(flag);
  return i === -1 ? undefined : process.argv[i + 1];
}

const project = arg("project");
const email = arg("email");
const password = arg("password");
const fullName = arg("name") ?? "Admin";

if (!project || !email || !password) {
  console.error(
    "Usage: pnpm tsx scripts/bootstrap-admin.ts --project <firebase-project-id> --email <email> --password <password> [--name <full name>]",
  );
  process.exit(1);
}

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error(
    "Refusing to run: GOOGLE_APPLICATION_CREDENTIALS is not set.\n" +
      "Download a service account key from Firebase Console -> Project settings\n" +
      "-> Service accounts, then:\n" +
      "  export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json",
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId: project });
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  console.log(`Targeting Firebase project: ${project}`);

  let user;
  let created = false;
  try {
    user = await auth.getUserByEmail(email!);
    console.log(`Found existing user ${user.uid} (${email}).`);
  } catch {
    user = await auth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: true,
    });
    created = true;
    console.log(`Created new user ${user.uid} (${email}).`);
  }

  await auth.setCustomUserClaims(user.uid, { role: "super_admin" });
  await db.collection("users").doc(user.uid).set(
    {
      fullName,
      email,
      phoneNumber: "",
      role: "super_admin",
      photoURL: null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );

  console.log(
    `\n${email} is now a super_admin on ${project}.` +
      (created ? " Sign in with the password you passed above." : "") +
      "\nChange the password after first login — it was passed in plaintext on the command line.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
