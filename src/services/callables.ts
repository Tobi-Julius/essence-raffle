"use client";

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";
import type {
  ClaimPrizeInput,
  DisqualifyWinnerInput,
  RedrawInput,
  RegisterForRaffleInput,
  ReviewPaymentInput,
  SetUserActiveInput,
  SetUserRoleInput,
  StartDrawInput,
  SubmitReceiptInput,
  UpdateDrawPresentationInput,
} from "@/lib/validation/schemas";

/**
 * Every function here proxies to a Cloud Function callable. This is the ONLY
 * path through which the client may request a privileged, money/eligibility/
 * winner/role-affecting operation. The callable re-validates everything —
 * the client is never trusted, this module is purely a typed transport.
 */

interface RegisterForRaffleResult {
  entryId: string;
  paymentId: string;
  reference: string;
  entryFee: number;
  currency: string;
}
export async function registerForRaffle(
  input: RegisterForRaffleInput,
): Promise<RegisterForRaffleResult> {
  const fn = httpsCallable<RegisterForRaffleInput, RegisterForRaffleResult>(
    functions,
    "registerForRaffle",
  );
  const { data } = await fn(input);
  return data;
}

interface SubmitReceiptResult {
  paymentId: string;
  status: string;
}
export async function submitReceipt(input: SubmitReceiptInput): Promise<SubmitReceiptResult> {
  const fn = httpsCallable<SubmitReceiptInput, SubmitReceiptResult>(functions, "submitReceipt");
  const { data } = await fn(input);
  return data;
}

interface ReviewPaymentResult {
  paymentId: string;
  status: string;
  entryNumber?: string;
}
export async function reviewPayment(input: ReviewPaymentInput): Promise<ReviewPaymentResult> {
  const fn = httpsCallable<ReviewPaymentInput, ReviewPaymentResult>(functions, "reviewPayment");
  const { data } = await fn(input);
  return data;
}

interface PublishRaffleResult {
  raffleId: string;
  status: string;
}
export async function publishRaffle(raffleId: string): Promise<PublishRaffleResult> {
  const fn = httpsCallable<{ raffleId: string }, PublishRaffleResult>(functions, "publishRaffle");
  const { data } = await fn({ raffleId });
  return data;
}

export async function cancelRaffle(raffleId: string, reason: string): Promise<PublishRaffleResult> {
  const fn = httpsCallable<{ raffleId: string; reason: string }, PublishRaffleResult>(
    functions,
    "cancelRaffle",
  );
  const { data } = await fn({ raffleId, reason });
  return data;
}

interface StartDrawResult {
  drawId: string;
  status: string;
}
export async function startDraw(input: StartDrawInput): Promise<StartDrawResult> {
  const fn = httpsCallable<StartDrawInput, StartDrawResult>(functions, "startDraw");
  const { data } = await fn(input);
  return data;
}

export async function updateDrawPresentation(
  input: UpdateDrawPresentationInput,
): Promise<{ ok: true }> {
  const fn = httpsCallable<UpdateDrawPresentationInput, { ok: true }>(
    functions,
    "updateDrawPresentation",
  );
  const { data } = await fn(input);
  return data;
}

interface DisqualifyWinnerResult {
  winnerId: string;
  status: string;
}
export async function disqualifyWinner(
  input: DisqualifyWinnerInput,
): Promise<DisqualifyWinnerResult> {
  const fn = httpsCallable<DisqualifyWinnerInput, DisqualifyWinnerResult>(
    functions,
    "disqualifyWinner",
  );
  const { data } = await fn(input);
  return data;
}

interface RedrawResult {
  winnerId: string | null;
  status: string;
}
export async function redraw(input: RedrawInput): Promise<RedrawResult> {
  const fn = httpsCallable<RedrawInput, RedrawResult>(functions, "redraw");
  const { data } = await fn(input);
  return data;
}

export async function claimPrize(input: ClaimPrizeInput): Promise<{ ok: true }> {
  const fn = httpsCallable<ClaimPrizeInput, { ok: true }>(functions, "claimPrize");
  const { data } = await fn(input);
  return data;
}

export async function setUserRole(input: SetUserRoleInput): Promise<{ ok: true }> {
  const fn = httpsCallable<SetUserRoleInput, { ok: true }>(functions, "setUserRole");
  const { data } = await fn(input);
  return data;
}

export async function setUserActive(input: SetUserActiveInput): Promise<{ ok: true }> {
  const fn = httpsCallable<SetUserActiveInput, { ok: true }>(functions, "setUserActive");
  const { data } = await fn(input);
  return data;
}

interface PublishTermsResult {
  termsId: string;
  version: number;
}
export async function publishTerms(raffleId: string, termsId: string): Promise<PublishTermsResult> {
  const fn = httpsCallable<{ raffleId: string; termsId: string }, PublishTermsResult>(
    functions,
    "publishTerms",
  );
  const { data } = await fn({ raffleId, termsId });
  return data;
}
