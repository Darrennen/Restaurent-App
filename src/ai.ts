import { GoogleGenAI } from '@google/genai';
import type { InventoryItem, Order } from './types';

let client: GoogleGenAI | null = null;

function getClient() {
  if (!client) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    client = new GoogleGenAI({ apiKey: key });
  }
  return client;
}

export async function askAI(
  prompt: string,
  inventory: InventoryItem[],
  orders: Order[]
): Promise<string> {
  const ai = getClient();

  const context = `
You are KAI, an AI assistant for Kinetic Kitchen — a restaurant management system.
You help the kitchen team with inventory management, order insights, and operational decisions.
Be concise and practical. Use plain text, no markdown.

Current Inventory:
${inventory.map((i) => `- ${i.name} (${i.category}): ${i.quantity} ${i.unit} [${i.status}]`).join('\n')}

Current Orders:
${orders.filter((o) => o.status !== 'served').map((o) => `- ${o.id} Table ${o.table}: ${o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')} [${o.status}]`).join('\n')}

User: ${prompt}
KAI:`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: context,
  });

  return response.text ?? 'Sorry, I could not generate a response.';
}

export async function getReorderSuggestions(inventory: InventoryItem[]): Promise<string> {
  const ai = getClient();

  const critical = inventory.filter((i) => i.status === 'critical' || i.status === 'warning');
  if (critical.length === 0) return 'All inventory levels look healthy. No immediate reorders needed.';

  const prompt = `
You are KAI, an AI assistant for a high-end restaurant.
Based on this low-stock inventory, give 2-3 concise reorder recommendations with suggested quantities.
Use plain text, no markdown, no bullet symbols.

Low Stock Items:
${critical.map((i) => `${i.name}: ${i.quantity} ${i.unit} remaining (threshold: ${i.minThreshold} ${i.unit})`).join('\n')}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  return response.text ?? 'Unable to generate suggestions.';
}
