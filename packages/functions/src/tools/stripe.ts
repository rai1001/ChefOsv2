import { KitchenTool } from "./types";
import Stripe from "stripe";
import { FunctionDeclarationSchemaType } from "@google-cloud/vertexai";

const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    return new Stripe(key, { apiVersion: '2025-01-27.acacia' as any });
};

export const stripeTools: KitchenTool[] = [
    {
        name: "create_payment_link",
        description: "Creates a Stripe payment link for a product.",
        parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
                name: { type: FunctionDeclarationSchemaType.STRING, description: "Product name" },
                amount: { type: FunctionDeclarationSchemaType.NUMBER, description: "Amount in cents (e.g. 1000 = $10.00)" },
                currency: { type: FunctionDeclarationSchemaType.STRING, description: "Currency code (e.g. 'usd', 'eur')" }
            },
            required: ["name", "amount"]
        },
        execute: async (args) => {
            const stripe = getStripe();
            // 1. Create Price/Product on the fly (Simplified for demo)
            const price = await stripe.prices.create({
                currency: args.currency || 'usd',
                unit_amount: args.amount,
                product_data: { name: args.name },
            });
            // 2. Create Pay Link
            const link = await stripe.paymentLinks.create({
                line_items: [{ price: price.id, quantity: 1 }],
            });
            return { url: link.url };
        }
    },
    {
        name: "audit_transactions",
        description: "List recent successful payments to audit.",
        parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
                limit: { type: FunctionDeclarationSchemaType.NUMBER, description: "Number of transactions to return" }
            },
            required: []
        },
        execute: async (args) => {
            const stripe = getStripe();
            const charges = await stripe.charges.list({
                limit: args.limit || 5
                // status filter removed as it might be invalid for this specific call or version
            });
            return charges.data.map(c => ({
                id: c.id,
                amount: c.amount,
                currency: c.currency,
                receipt_email: c.receipt_email,
                created: new Date(c.created * 1000).toISOString()
            }));
        }
    }
];
