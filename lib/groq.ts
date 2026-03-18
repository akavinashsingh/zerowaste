import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set.");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
