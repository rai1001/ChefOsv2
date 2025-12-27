import { KitchenTool } from "./types";
import { WebClient } from "@slack/web-api";
import { FunctionDeclarationSchemaType } from "@google-cloud/vertexai";

const getSlack = () => {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error("SLACK_BOT_TOKEN not set");
    return new WebClient(token);
};

export const slackTools: KitchenTool[] = [
    {
        name: "send_slack_message",
        description: "Sends a message to a Slack channel.",
        parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
                channel: { type: FunctionDeclarationSchemaType.STRING, description: "Channel ID or Name (e.g. #general)" },
                text: { type: FunctionDeclarationSchemaType.STRING, description: "Message content" }
            },
            required: ["channel", "text"]
        },
        execute: async (args) => {
            const slack = getSlack();
            const result = await slack.chat.postMessage({
                channel: args.channel,
                text: args.text
            });
            return { ok: result.ok, ts: result.ts };
        }
    }
];
