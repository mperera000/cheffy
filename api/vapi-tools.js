// The Vercel function Vapi calls. Checks the shared secret, runs each tool call,
// and replies in Vapi's format: {"results":[{"toolCallId","result"}]}.

import { secretMatches } from "../lib/auth.js";
import { runToolCall } from "../lib/tools.js";

function readBody(req) {
  try {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return null; // Vercel's body getter throws on malformed JSON.
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const secret = process.env.TOOL_SECRET;
  if (secret && !secretMatches(req.headers["x-tool-secret"], secret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const body = readBody(req);
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // Vapi sends other server messages to the same URL; those need no tool work.
  const message = body.message;
  if (message?.type !== "tool-calls") return res.status(200).json({});

  const toolCalls = Array.isArray(message.toolCallList) ? message.toolCallList : [];
  const results = await Promise.all(
    toolCalls.map((toolCall) =>
      runToolCall({
        id: toolCall?.id,
        name: toolCall?.function?.name,
        args: toolCall?.function?.arguments,
      }),
    ),
  );

  return res.status(200).json({ results });
}
