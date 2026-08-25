import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";

/**
 * Executes the ACTUAL firestore.rules file against the Firestore emulator —
 * this is what proves the security model in that file (not just the
 * comments in it) holds. Requires the emulator, so it's skipped unless
 * FIRESTORE_EMULATOR_HOST is set (see package.json `test:rules`).
 */
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const describeIfEmulator = emulatorHost ? describe : describe.skip;

describeIfEmulator("firestore.rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "essence-raffle-rules-test",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  const participant = () => testEnv.authenticatedContext("participant-1", { role: "participant" });
  const otherParticipant = () => testEnv.authenticatedContext("participant-2", { role: "participant" });
  const admin = () => testEnv.authenticatedContext("admin-1", { role: "admin" });
  const anon = () => testEnv.unauthenticatedContext();

  it("lets a user create their own profile with role forced to participant", async () => {
    const db = participant().firestore();
    await assertSucceeds(
      setDoc(doc(db, "users/participant-1"), {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phoneNumber: "+2348000000000",
        role: "participant",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("blocks a user from self-assigning the admin role at signup", async () => {
    const db = participant().firestore();
    await assertFails(
      setDoc(doc(db, "users/participant-1"), {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phoneNumber: "+2348000000000",
        role: "admin",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  it("blocks a user from promoting themselves to admin via update", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/participant-1"), {
        fullName: "Jane Doe",
        email: "jane@example.com",
        phoneNumber: "+2348000000000",
        role: "participant",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = participant().firestore();
    await assertFails(updateDoc(doc(db, "users/participant-1"), { role: "admin" }));
  });

  it("blocks a participant from reading another participant's profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/participant-2"), {
        fullName: "John",
        email: "john@example.com",
        phoneNumber: "+2348000000000",
        role: "participant",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    const db = participant().firestore();
    await assertFails(getDoc(doc(db, "users/participant-2")));
  });

  it("blocks a participant from directly approving a payment", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "payments/pay-1"), {
        raffleId: "raffle-1",
        userId: "participant-1",
        entryId: "entry-1",
        amount: 2000,
        currency: "NGN",
        status: "pending",
      });
    });
    const db = participant().firestore();
    await assertFails(updateDoc(doc(db, "payments/pay-1"), { status: "approved" }));
  });

  it("blocks even an admin from writing payment status directly (must go through the callable)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "payments/pay-1"), {
        raffleId: "raffle-1",
        userId: "participant-1",
        entryId: "entry-1",
        amount: 2000,
        currency: "NGN",
        status: "pending",
      });
    });
    const db = admin().firestore();
    await assertFails(updateDoc(doc(db, "payments/pay-1"), { status: "approved" }));
  });

  it("blocks a client from writing a winner record directly", async () => {
    const db = admin().firestore();
    await assertFails(
      addDoc(collection(db, "winners"), {
        raffleId: "raffle-1",
        entryId: "entry-1",
        userId: "participant-1",
        entryNumber: "RFL-2026-000001",
        displayName: "Jane D.",
        status: "pending_verification",
        isActive: true,
      }),
    );
  });

  it("blocks a client from writing an audit log entry", async () => {
    const db = admin().firestore();
    await assertFails(
      addDoc(collection(db, "auditLogs"), {
        action: "PAYMENT_APPROVED",
        actorId: "admin-1",
        actorRole: "admin",
        timestamp: new Date(),
      }),
    );
  });

  it("blocks a non-admin from reading audit logs", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "auditLogs/log-1"), { action: "PAYMENT_APPROVED", actorId: "admin-1" });
    });
    await assertFails(getDoc(doc(participant().firestore(), "auditLogs/log-1")));
    await assertSucceeds(getDoc(doc(admin().firestore(), "auditLogs/log-1")));
  });

  it("blocks an unauthenticated client from creating a raffle", async () => {
    await assertFails(
      setDoc(doc(anon().firestore(), "raffles/raffle-x"), {
        name: "Hack",
        status: "DRAFT",
        createdBy: "nobody",
        hasWinner: false,
        stats: { totalRegistrations: 0 },
      }),
    );
  });

  it("blocks an admin from editing a raffle once it's OPEN", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "raffles/raffle-1"), {
        name: "Open Raffle",
        status: "OPEN",
        createdBy: "admin-1",
        hasWinner: false,
      });
    });
    await assertFails(updateDoc(doc(admin().firestore(), "raffles/raffle-1"), { name: "Renamed" }));
  });

  it("never allows deleting a raffle entry (append-only history)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "entries/entry-1"), { userId: "participant-1", raffleId: "raffle-1" });
    });
    await assertFails(deleteDoc(doc(admin().firestore(), "entries/entry-1")));
    await assertFails(deleteDoc(doc(participant().firestore(), "entries/entry-1")));
  });

  it("blocks registration once approved participants have reached the raffle's cap", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "raffles/raffle-1"), {
        name: "Full Raffle",
        status: "OPEN",
        createdBy: "admin-1",
        hasWinner: false,
        entryConfig: { allowMultipleEntries: false, maxEntriesPerUser: 1, maxParticipants: 1 },
        stats: {
          totalRegistrations: 1,
          paymentsPending: 0,
          paymentsApproved: 1,
          paymentsRejected: 0,
          eligibleEntries: 1,
          disqualifiedEntries: 0,
        },
      });
    });
    const db = participant().firestore();
    await assertFails(
      updateDoc(doc(db, "raffles/raffle-1"), {
        "stats.totalRegistrations": 2,
        "stats.paymentsPending": 1,
      }),
    );
  });

  it("lets a participant read only their own entry, not someone else's", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "entries/entry-1"), { userId: "participant-1", raffleId: "raffle-1" });
    });
    await assertSucceeds(getDoc(doc(participant().firestore(), "entries/entry-1")));
    await assertFails(getDoc(doc(otherParticipant().firestore(), "entries/entry-1")));
  });
});
