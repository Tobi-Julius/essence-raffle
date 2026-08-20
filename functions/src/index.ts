import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ maxInstances: 10, region: "us-central1" });

export { onUserCreate } from "./auth/onUserCreate";

export { publishRaffle } from "./raffles/publishRaffle";
export { cancelRaffle } from "./raffles/cancelRaffle";
export { publishTerms } from "./raffles/publishTerms";

export { registerForRaffle } from "./payments/registerForRaffle";
export { submitReceipt } from "./payments/submitReceipt";
export { reviewPayment } from "./payments/reviewPayment";

export { startDraw } from "./draws/startDraw";
export { updateDrawPresentation } from "./draws/updateDrawPresentation";

export { disqualifyWinner } from "./winners/disqualifyWinner";
export { redraw } from "./winners/redraw";
export { claimPrize } from "./winners/claimPrize";

export { setUserRole } from "./admin/setUserRole";
export { setUserActive } from "./admin/setUserActive";

export { transitionRaffleStatuses } from "./scheduled/transitionRaffleStatuses";
