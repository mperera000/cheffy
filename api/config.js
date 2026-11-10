// Gives the page the two values Vapi's web library needs. Both are safe in a
// browser: the public key is meant for client use, and the assistant ID is not secret.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    publicKey: process.env.VAPI_PUBLIC_KEY || "",
    assistantId: process.env.VAPI_ASSISTANT_ID || "",
  });
}
