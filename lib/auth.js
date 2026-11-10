// Constant-time secret comparison, shared by every endpoint that needs one.

import { createHash, timingSafeEqual } from "node:crypto";

// Hashing first gives equal-length inputs, which timingSafeEqual requires.
export function secretMatches(provided, expected) {
  const hash = (value) => createHash("sha256").update(String(value ?? "")).digest();
  return timingSafeEqual(hash(provided), hash(expected));
}
