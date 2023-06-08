import * as vscode from "vscode";

export const COST_PER_TOKEN = 0.06 / 1000; // Assuming $0.06 per 1000 tokens for Davinci engine

export const LOG_PROMO = `AI Docs & Comments: `;

export const popup = vscode.window.showInformationMessage;
