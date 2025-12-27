import { KitchenTool } from "./types";
import { Resend } from "resend";
import { FunctionDeclarationSchemaType } from "@google-cloud/vertexai";

const getResend = () => {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY not set");
    return new Resend(key);
};

export const resendTools: KitchenTool[] = [
    {
        name: "send_email",
        description: "Sends an email via Resend.",
        parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
                to: { type: FunctionDeclarationSchemaType.STRING, description: "Recipient email" },
                subject: { type: FunctionDeclarationSchemaType.STRING, description: "Email subject" },
                html: { type: FunctionDeclarationSchemaType.STRING, description: "HTML content of the email" }
            },
            required: ["to", "subject", "html"]
        },
        execute: async (args) => {
            const resend = getResend();
            const { data, error } = await resend.emails.send({
                from: 'ChefOS <onboarding@resend.dev>', // Should be configured env var ideally
                to: [args.to],
                subject: args.subject,
                html: args.html,
            });

            if (error) {
                console.error("Resend Error", error);
                throw new Error(error.message);
            }
            return { id: data?.id };
        }
    }
];
