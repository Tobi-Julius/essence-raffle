/**
 * Development seed script — populates the Firebase Emulator Suite with
 * sample data (an admin, a participant, and one raffle in each lifecycle
 * stage) so the app can be exercised end-to-end without manual setup.
 *
 * SAFETY: this refuses to run unless FIRESTORE_EMULATOR_HOST and
 * FIREBASE_AUTH_EMULATOR_HOST are set, so it can never accidentally write
 * seed/demo data into a real production project.
 *
 * Usage:
 *   firebase emulators:start   (in one terminal)
 *   pnpm run seed              (in another)
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (
  !process.env.FIRESTORE_EMULATOR_HOST ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST
) {
  console.error(
    "Refusing to seed: FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST are not set.\n" +
      "Run this only against the local Firebase Emulator Suite, e.g.:\n" +
      '  firebase emulators:exec --only auth,firestore "pnpm run seed"',
  );
  process.exit(1);
}

const app = initializeApp({
  projectId: process.env.PROJECT_ID ?? "essence-raffle-demo",
});
const db = getFirestore(app);
const auth = getAuth(app);

async function upsertAuthUser(
  email: string,
  password: string,
  displayName: string,
  role: "participant" | "admin" | "super_admin",
) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });
  }
  await db.collection("users").doc(user.uid).set(
    {
      fullName: displayName,
      email,
      phoneNumber: "+2348000000000",
      role,
      photoURL: null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
  return user.uid;
}

function daysFromNow(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

async function seedTerms(raffleId: string, createdBy: string) {
  const termsRef = db
    .collection("raffles")
    .doc(raffleId)
    .collection("terms")
    .doc();
  const html =
    "<h2>Eligibility</h2><p>Open to all Essence Store customers aged 18 and above.</p>" +
    "<h2>Entry</h2><p>One paid entry per ticket. Payment must be verified before an entry becomes official.</p>" +
    "<h2>Prize</h2><p>The prize is non-transferable and has no cash alternative.</p>";
  await termsRef.set({
    raffleId,
    version: 1,
    contentJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "See published terms." }],
        },
      ],
    },
    contentHtml: html,
    status: "active",
    createdBy,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return termsRef.id;
}

async function seedPrize(
  raffleId: string,
  name: string,
  description: string,
  value: number,
) {
  await db.collection("prizes").doc(raffleId).set({
    raffleId,
    name,
    description,
    imageUrl: null,
    videoUrl: null,
    value,
    currency: "NGN",
    status: "available",
    claimedAt: null,
    claimedBy: null,
    verifiedBy: null,
    claimNotes: null,
    deliveryDate: null,
    deliveryMethod: null,
    proofOfDeliveryPath: null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

async function main() {
  console.log("Seeding Essence Store raffle emulator data…");

  const adminUid = await upsertAuthUser(
    "admin@essencestore.example",
    "Password1",
    "Essence Admin",
    "super_admin",
  );
  const participantUid = await upsertAuthUser(
    "jane@example.com",
    "Password1",
    "Jane Doe",
    "participant",
  );
  const participant2Uid = await upsertAuthUser(
    "john@example.com",
    "Password1",
    "John Okafor",
    "participant",
  );

  const baseRaffle = {
    createdBy: adminUid,
    payment: {
      entryFee: 2000,
      currency: "NGN",
      bankName: "Essence Microfinance Bank",
      accountName: "Essence Store Ltd",
      accountNumber: "0123456789",
      instructions:
        "Use the exact payment reference shown as your transfer narration.",
    },
    eligibility: {
      type: "everyone" as const,
      description: "Open to everyone.",
    },
    entryConfig: { allowMultipleEntries: true, maxEntriesPerUser: 5, maxParticipants: 200 },
    activeTermsId: null as string | null,
    activeTermsVersion: null as number | null,
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
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  // Upcoming raffle
  const upcomingRef = db.collection("raffles").doc();
  await upcomingRef.set({
    ...baseRaffle,
    name: "New Year Grocery Bonanza",
    nameLower: "new year grocery bonanza",
    slug: "new-year-grocery-bonanza",
    shortDescription: "Win a year's worth of groceries from Essence Store.",
    fullDescription:
      "Enter for a chance to win a full year of free groceries. Registration opens soon.",
    status: "UPCOMING",
    schedule: {
      timezone: "Africa/Lagos",
      registrationStart: daysFromNow(3),
      registrationEnd: daysFromNow(20),
      drawAt: daysFromNow(21),
    },
  });
  const upcomingTermsId = await seedTerms(upcomingRef.id, adminUid);
  await upcomingRef.update({
    activeTermsId: upcomingTermsId,
    activeTermsVersion: 1,
  });
  await seedPrize(
    upcomingRef.id,
    "1 Year of Free Groceries",
    "A prize voucher redeemable in-store, month by month, for 12 months.",
    600000,
  );

  // Open (present) raffle, with a couple of approved entries
  const openRef = db.collection("raffles").doc();
  await openRef.set({
    ...baseRaffle,
    name: "Essence Store Anniversary Raffle",
    nameLower: "essence store anniversary raffle",
    slug: "essence-store-anniversary-raffle",
    shortDescription: "Celebrate our anniversary — win a brand-new smartphone.",
    fullDescription:
      "To celebrate another year serving our community, we're giving away a brand-new smartphone to one lucky winner.",
    status: "OPEN",
    schedule: {
      timezone: "Africa/Lagos",
      registrationStart: daysFromNow(-2),
      registrationEnd: daysFromNow(10),
      drawAt: daysFromNow(11),
    },
  });
  const openTermsId = await seedTerms(openRef.id, adminUid);
  await openRef.update({ activeTermsId: openTermsId, activeTermsVersion: 1 });
  await seedPrize(
    openRef.id,
    "Smartphone",
    "The latest mid-range smartphone, brand new and sealed.",
    350000,
  );

  await seedApprovedEntry(openRef.id, participantUid, "jane@example.com", 1);
  await seedApprovedEntry(openRef.id, participant2Uid, "john@example.com", 2);

  // Completed raffle, with a winner
  const completedRef = db.collection("raffles").doc();
  await completedRef.set({
    ...baseRaffle,
    name: "Christmas Mega Raffle 2025",
    nameLower: "christmas mega raffle 2025",
    slug: "christmas-mega-raffle-2025",
    shortDescription: "Our biggest raffle of the year — already drawn.",
    fullDescription:
      "Our biggest raffle of the year. The draw has concluded and the winner has been announced.",
    status: "COMPLETED",
    schedule: {
      timezone: "Africa/Lagos",
      registrationStart: daysFromNow(-40),
      registrationEnd: daysFromNow(-10),
      drawAt: daysFromNow(-9),
    },
    hasWinner: true,
  });
  const completedTermsId = await seedTerms(completedRef.id, adminUid);
  await completedRef.update({
    activeTermsId: completedTermsId,
    activeTermsVersion: 1,
  });
  await seedPrize(
    completedRef.id,
    "₦500,000 Cash Prize",
    "Paid directly to the winner's bank account.",
    500000,
  );

  const { entryId, entryNumber } = await seedApprovedEntry(
    completedRef.id,
    participantUid,
    "jane@example.com",
    1,
  );
  await completedRef.update({ currentWinnerEntryId: entryId });
  await db.collection("entries").doc(entryId).update({ status: "winner" });

  const drawRef = db.collection("draws").doc();
  await drawRef.set({
    raffleId: completedRef.id,
    status: "completed",
    presentationState: "COMPLETED",
    initiatedBy: adminUid,
    startedAt: daysFromNow(-9),
    completedAt: daysFromNow(-9),
    eligibleEntryCount: 1,
    randomizationVersion: "seed-script",
    failureReason: null,
    createdAt: daysFromNow(-9),
  });
  await db.collection("winners").add({
    raffleId: completedRef.id,
    drawId: drawRef.id,
    entryId,
    userId: participantUid,
    entryNumber,
    displayName: "Jane D.",
    status: "prize_assigned",
    isActive: true,
    disqualifiedBy: null,
    disqualifiedAt: null,
    disqualificationReason: null,
    isRedraw: false,
    redrawOfWinnerId: null,
    redrawReason: null,
    createdAt: daysFromNow(-9),
    updatedAt: daysFromNow(-9),
  });

  console.log("Seed complete.");
  console.log("  Admin login:       admin@essencestore.example / Password1");
  console.log("  Participant login: jane@example.com / Password1");

  async function seedApprovedEntry(
    raffleId: string,
    userId: string,
    _email: string,
    sequence: number,
  ) {
    const entryNumber = `RFL-${new Date().getFullYear()}-${String(sequence).padStart(6, "0")}`;
    const paymentRef = db.collection("payments").doc();
    const entryRef = db.collection("entries").doc();
    await paymentRef.set({
      raffleId,
      userId,
      entryId: entryRef.id,
      amount: 2000,
      currency: "NGN",
      paymentMethod: "bank_transfer",
      reference: `RFL-${new Date().getFullYear()}-SEED${sequence}`,
      status: "approved",
      refundStatus: "none",
      reviewedAt: Timestamp.now(),
      reviewedBy: adminUid,
      rejectionReason: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await entryRef.set({
      raffleId,
      userId,
      paymentId: paymentRef.id,
      entryNumber,
      sequence,
      status: "eligible",
      isEligible: true,
      termsId: "seed",
      termsVersion: 1,
      termsAcceptedAt: Timestamp.now(),
      joinedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await db.collection("raffles").doc(raffleId).update({
      "stats.totalRegistrations": sequence,
      "stats.paymentsApproved": sequence,
      "stats.eligibleEntries": sequence,
    });
    return { entryId: entryRef.id, entryNumber };
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
