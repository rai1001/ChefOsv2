import { KitchenTool } from "./types";
import { Octokit } from "octokit";
import { FunctionDeclarationSchemaType } from "@google-cloud/vertexai";

const getOctokit = () => {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error("GITHUB_TOKEN not set");
    return new Octokit({ auth: token });
};

export const githubTools: KitchenTool[] = [
    {
        name: "create_github_issue",
        description: "Creates a new issue in a GitHub repository.",
        parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
                owner: { type: FunctionDeclarationSchemaType.STRING, description: "Repository owner (e.g., 'facebook')" },
                repo: { type: FunctionDeclarationSchemaType.STRING, description: "Repository name (e.g., 'react')" },
                title: { type: FunctionDeclarationSchemaType.STRING, description: "Title of the issue" },
                body: { type: FunctionDeclarationSchemaType.STRING, description: "Body/Content of the issue" }
            },
            required: ["owner", "repo", "title"]
        },
        execute: async (args) => {
            const octokit = getOctokit();
            const { data } = await octokit.rest.issues.create({
                owner: args.owner,
                repo: args.repo,
                title: args.title,
                body: args.body,
            });
            return { issue_url: data.html_url, number: data.number };
        }
    },
    {
        name: "list_pull_requests",
        description: "Lists open pull requests in a repository.",
        parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
                owner: { type: FunctionDeclarationSchemaType.STRING, description: "Repository owner" },
                repo: { type: FunctionDeclarationSchemaType.STRING, description: "Repository name" },
                state: { type: FunctionDeclarationSchemaType.STRING, description: "State of PRs (open, closed, all). Defaults to open." }
            },
            required: ["owner", "repo"]
        },
        execute: async (args) => {
            const octokit = getOctokit();
            const { data } = await octokit.rest.pulls.list({
                owner: args.owner,
                repo: args.repo,
                state: args.state || "open"
            });
            return data.map((pr: any) => ({
                number: pr.number,
                title: pr.title,
                user: pr.user?.login,
                url: pr.html_url
            }));
        }
    }
];
