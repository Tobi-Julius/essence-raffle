# Essence Store Raffles

A production-architected raffle platform for Essence Store (a convenience store): participants register, accept
raffle-specific terms, pay by bank transfer, upload a receipt, and get an official entry number once an admin
verifies the payment. Each raffle has **exactly one prize and one winner**, selected securely on the server and
revealed live on a dedicated `/draw/[raffleId]` screen.

Stack: **Next.js (App Router) + TypeScript (strict) + Tailwind CSS + Firebase** (Auth, Firestore, Storage, Cloud
Functions, App Check).

---

## 1. Architecture, in one sentence

> The browser can *request* an operation; only a Cloud Function *decides* whether it's allowed.

Every operation that touches money, eligibility, terms publication, winner selection, or roles is implemented in
`functions/src/**` using the Firebase Admin SDK (which bypasses Firestore/Storage security rules) and is re-validated
there from scratch — the client's belief about its own role, a raffle's status, or a payment's state is never
trusted. `firestore.rules` / `storage.rules` are the backstop for direct client SDK access (reads, and the handful of
low-risk content writes like draft raffle editing), not the primary authorization layer for sensitive writes.

```
src/
  app/            Next.js App Router routes — (public), dashboard, admin, draw
  components/     ui/ (design system), layout/, raffle/, payment/, admin/, draw/, auth/
  hooks/          useAuth, useRaffleBundle, useAdminRaffle
  services/       Typed Firestore reads + callable-function wrappers (the ONLY way the UI touches Firebase)
  lib/            firebase client config, validation (Zod), permissions (UX-only), utils, errors
  types/          Domain models shared across the client (functions/ keeps its own mirrored copy)
functions/
  src/
    auth/         onUserCreate (forces the "participant" custom claim)
    raffles/      publishRaffle, cancelRaffle, publishTerms
    payments/     registerForRaffle, submitReceipt, reviewPayment
    draws/        startDraw (secure winner selection), updateDrawPresentation
    winners/      disqualifyWinner, redraw, claimPrize
    admin/        setUserRole, setUserActive
    scheduled/    transitionRaffleStatuses (server-clock-driven lifecycle sweep)
    shared/       admin SDK init, auth/authorization guards, audit log writer, entry-number/reference
                  generators, validation schemas
firestore.rules / storage.rules / firestore.indexes.json / firebase.json
scripts/seed.ts   Emulator-only seed data (refuses to run against a real project)
```

### Deliberate deviations from a generic multi-prize raffle template

The product brief for this build is: **a convenience store's raffle platform, one winner per raffle**, with an
admin-uploadable **prize image and video**. So, versus a generic spec:

- `Prize` is a single document per raffle (`prizes/{raffleId}`), not a ranked multi-tier collection. It carries
  `imageUrl`/`videoUrl` set by the admin at `/admin/raffles/[raffleId]/prizes`, shown to participants on the raffle
  details page and the participant dashboard.
- The draw (`startDraw`) always selects exactly **one** winner from the eligible pool. There is no
  `allowMultipleWins` concept — disqualification + redraw always fills the same single winner slot.
- Winners are always shown publicly with a masked name (`maskName`, e.g. "Chidinma O.") — never full name, email,
  phone, or receipt.

---

## 2. Firebase project setup

### 2.1 Create the project and turn on the services this app uses

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)** → **Add project** → name it (e.g.
   `essence-store-raffles`) → follow the prompts (Google Analytics is optional — see the `measurementId` note
   below).
2. **Build → Authentication → Get started → Sign-in method** tab → enable **Email/Password**.
3. **Build → Firestore Database → Create database** → start in **production mode** → pick a region close to your
   users (e.g. `nam5`/`eur3`) → Enable.
4. **Build → Storage → Get started** → keep the default bucket and rules prompt (we overwrite the rules from this
   repo below) → Done.
5. Leave **App Check** for last — see §2.3, it needs the app registered first.

### 2.2 Get the seven `NEXT_PUBLIC_FIREBASE_*` values

These come from one place: your **Web app's** SDK config.

1. In the Firebase Console, open your project → click the **gear icon → Project settings**.
2. Scroll to **Your apps**. If there's no web app yet, click the **`</>`** (Web) icon → give it a nickname (e.g.
   "Essence Raffle Web") → you can skip "Also set up Firebase Hosting" → **Register app**.
3. Firebase shows a `firebaseConfig` object — map it directly into `.env.local` (copy
   `.env.local.example` → `.env.local` first):

   | In the `firebaseConfig` snippet | → | `.env.local` variable |
   |---|---|---|
   | `apiKey` | | `NEXT_PUBLIC_FIREBASE_API_KEY` |
   | `authDomain` | | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
   | `storageBucket` | | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
   | `messagingSenderId` | | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` |
   | `appId` | | `NEXT_PUBLIC_FIREBASE_APP_ID` |
   | `measurementId` | | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` |

4. If you land on this screen later without copying it: **Project settings → General** tab → **Your apps** → click
   your web app → the **SDK setup and configuration** panel → **Config** radio button shows the same object again.
5. `measurementId` only exists if Google Analytics is linked to the project. If you skipped Analytics in step 1,
   just leave `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` blank — nothing in this app calls the Analytics SDK, so it's
   safe to omit.

None of these seven values are secret — they're the public client identifier Firebase itself expects to ship in
browser JS. Access control comes entirely from `firestore.rules` / `storage.rules` / Cloud Function authorization
checks, never from hiding this config.

### 2.3 Get `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` (optional for local dev)

Leave this blank for local development — `ensureAppCheck()` in `src/lib/firebase/client.ts` simply no-ops when it's
unset. Set it up before you plan to **enforce** App Check (production, or a shared staging environment):

1. **Build → App Check** in the Firebase Console → find your Web app in the list → **Register**.
2. Choose **reCAPTCHA Enterprise** as the provider. Firebase will prompt you to enable the reCAPTCHA Enterprise API
   on the linked Google Cloud project if it isn't already — follow that prompt (this requires the GCP project to be
   on a **Blaze (pay-as-you-go)** billing plan; reCAPTCHA Enterprise isn't available on the free Spark plan).
3. Either let Firebase auto-create a key for you during registration, or create one yourself first at
   **[console.cloud.google.com/security/recaptcha](https://console.cloud.google.com/security/recaptcha)** (same GCP
   project) → **Create key** → platform type **Website** → add the domains that will serve this app (`localhost`
   for dev, your Vercel/Firebase Hosting domain, any custom domain) → copy the generated **Site Key**.
4. Paste that Site Key into the App Check registration screen if it wasn't auto-filled, and **Save**.
5. Copy the same Site Key into `.env.local` as `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`.
6. **Don't** flip the "Enforce" toggle for Firestore/Storage/Functions yet — do that only after you've deployed and
   manually verified sign-up, receipt upload, and the admin draw flow all still work (see §5). Enforcing early locks
   out any client — including your own — that isn't already passing an App Check token.

### 2.4 CLI + everything else

1. `pnpm add -g firebase-tools && firebase login && firebase use --add` (pick the project you just created; this
   writes `.firebaserc` — the one at the repo root has a placeholder `default` project id to replace).
2. Cloud Functions run on Node 20 (`functions/package.json` pins `engines.node`).

`functions/` needs no `.env` file for this build — Cloud Functions get project credentials automatically from the
Firebase runtime (or Application Default Credentials locally via `gcloud auth application-default login` /
the emulator).

---

## 3. Local development

Two independent packages, each with its own lockfile — install both:

```bash
pnpm install                 # root: the Next.js app
pnpm --dir functions install # functions/: Cloud Functions
```

```bash
# Terminal 1 — Firebase emulators (Auth, Firestore, Storage, Functions)
pnpm --dir functions run build:watch   # keep functions compiled
firebase emulators:start

# Terminal 2 — seed sample data into the emulators (admin + participant + one raffle per lifecycle stage)
pnpm run seed

# Terminal 3 — the Next.js app
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

Seeded logins (emulator only):

- Admin: `admin@essencestore.example` / `Password1`
- Participant: `jane@example.com` / `Password1`

Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local` (or inline as above) to point the client SDK at the
emulator suite instead of production.

---

## 4. Testing

```bash
pnpm test            # pure-logic unit tests (Zod validation, entry-number/name masking, lifecycle status math)
pnpm run test:rules   # boots the REAL Firestore emulator and runs firestore.rules against it (needs Java 21+)
pnpm --dir functions run typecheck
```

`pnpm run test:rules` executes `src/lib/firebase/firestore.rules.test.ts` against the actual `firestore.rules` file —
it's what proves the security model (no self-role-elevation, no direct payment/winner writes, audit logs are
read-only, cross-user reads are denied, etc.) holds, not just what the comments in that file claim. It's skipped
automatically (not failed) when no emulator is running, so `pnpm test` alone stays fast and dependency-free.

Full end-to-end coverage of the Cloud Functions themselves (double-approve idempotency, concurrent draw-start
locking, redraw exclusion) is best exercised via `firebase emulators:exec` driving the deployed callables directly
against the Functions + Firestore emulators together — the transaction-level guarantees described in the doc
comments in `functions/src/draws/startDraw.ts` and `functions/src/payments/reviewPayment.ts` are what to target if
extending this suite.

---

## 5. Deployment

**Cloud Functions, Firestore rules/indexes, and Storage rules** deploy via the Firebase CLI regardless of where the
Next.js app itself is hosted:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,functions
```

**The Next.js app** can be hosted anywhere that runs Next.js server-side (it is *not* statically exported — every
route reads live, per-request Firestore/Auth state, see `src/app/layout.tsx`'s `export const dynamic =
"force-dynamic"`). Vercel is the simplest option (zero config beyond the environment variables above). Firebase
Hosting's Next.js web-frameworks integration is a valid alternative if you want everything under one Firebase
project — follow `firebase init hosting` and let it detect the Next.js app.

Before enabling **App Check enforcement** in the Firebase Console, deploy and manually verify sign-up, payment
receipt upload, and the admin draw flow — enforcing too early will also block your own testing.

> **pnpm note:** `functions/` is developed and built locally with pnpm (`pnpm-lock.yaml`), but `firebase deploy`'s
> own packaging step installs the function's dependencies with npm server-side regardless of what you used locally —
> that's a firebase-tools implementation detail, not something this repo controls. It still resolves the exact same
> `functions/package.json`, so this doesn't change what gets deployed, only which tool locks it. If you want fully
> npm-driven deploys to feel deterministic too, run `pnpm --dir functions run build` once before deploying so
> `functions/lib` is already up to date going in.

---

## 6. Security checklist (see also §40/§41/§88 of the original spec)

- [x] No Firebase Admin SDK import anywhere under `src/` (only `functions/`, `scripts/seed.ts`) — grep for
      `firebase-admin` in `src/` to re-verify after any change.
- [x] `.env.local` is git-ignored; nothing in it is a secret regardless.
- [x] Firestore rules deny: self role/isActive changes, direct payment status writes, direct winner/draw/audit-log
      writes, cross-user reads of `users`/`entries`/`payments`, edits to a raffle once it's left DRAFT/UPCOMING.
- [x] Storage rules scope receipt read/write to `(raffleId, userId, paymentId)` ownership + admin; receipts are
      immutable once uploaded (rejection re-uploads go through a new payment record's path, not an overwrite).
- [x] Every privileged write (`registerForRaffle`, `submitReceipt`, `reviewPayment`, `publishRaffle`, `cancelRaffle`,
      `publishTerms`, `startDraw`, `updateDrawPresentation`, `disqualifyWinner`, `redraw`, `claimPrize`,
      `setUserRole`, `setUserActive`) is a Cloud Function that re-checks auth, role, and business-state from
      scratch.
- [x] Winner selection uses Node's `crypto.randomInt` (CSPRNG, rejection-sampled) inside a single Firestore
      transaction with the eligible-pool snapshot, the draw-lock check, and the result write — never
      `Math.random()`, never in the browser.
- [x] `reviewPayment` and `startDraw`/`redraw` are idempotent/lock-safe: re-approving an already-approved payment is
      a no-op; two concurrent "start draw" calls race on the same Firestore transaction and only one can win.
- [x] Terms acceptance stores the exact `(termsId, version, acceptedAt)` on the entry; publishing a new version
      archives the old one but never mutates it.
- [x] Audit logs (`auditLogs` collection) are append-only, written only by Cloud Functions, readable only by admins.

---

## 7. What's intentionally out of scope

- **Payment gateway integration** — bank transfer + manual receipt verification only, per the brief (§14).
- **Email/SMS delivery** — the app writes the state that *would* trigger a notification (payment approved, receipt
  rejected, winner selected); wiring an actual provider is a Cloud Functions Firestore-trigger away and was left as
  an explicit extension point rather than hard-coding a vendor, per the "email can be an abstraction" guidance.
- **Employee/customer group membership** — `RaffleEligibility.type` supports `employees_only` /
  `customers_only` / `specific_group` as data, and the UI surfaces it, but `registerForRaffle` doesn't yet enforce
  group membership (no such directory exists yet) — see the comment in that file for exactly where to add it.
