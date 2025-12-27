import { FunctionDeclarationSchema } from "@google-cloud/vertexai";

export interface KitchenTool {
    name: string;
    description: string;
    parameters: FunctionDeclarationSchema;
    execute: (args: any, context?: any) => Promise<any>;
}

export interface ToolContext {
    projectId: string;
    // Add other context needed (e.g., authenticated user)
}
