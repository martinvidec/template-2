// import { anthropic } from "@ai-sdk/anthropic";
// import { convertToCoreMessages, streamText } from "ai";

// export const runtime = "edge";

// export async function POST(req: Request) {
//   const { messages } = await req.json();
//   const result = await streamText({
//     model: anthropic("claude-3-5-sonnet-20240620"),
//     messages: convertToCoreMessages(messages),
//     system: "You are a helpful AI assistant",
//   });
// 
//   return result.toAIStreamResponse();
// }

// Return a placeholder response or error to avoid 404 if the route is hit
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  return NextResponse.json({ error: "Anthropic chat endpoint is currently disabled." }, { status: 503 });
}
