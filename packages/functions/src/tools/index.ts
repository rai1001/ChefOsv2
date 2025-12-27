import { githubTools } from "./github";
import { slackTools } from "./slack";
import { stripeTools } from "./stripe";
import { resendTools } from "./resend";
import { KitchenTool } from "./types";

export const allTools: KitchenTool[] = [
    ...githubTools,
    ...slackTools,
    ...stripeTools,
    ...resendTools
];
