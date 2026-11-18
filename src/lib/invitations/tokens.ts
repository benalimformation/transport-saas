import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function genererJetonInvitation(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: createHash("sha256").update(token).digest("hex"),
  };
}

export function verifierJetonInvitation(
  token: string,
  expectedHash: string
): boolean {
  if (!/^[0-9a-f]{64}$/.test(token)) {
    return false;
  }

  if (!/^[0-9a-f]{64}$/.test(expectedHash)) {
    return false;
  }

  const actualHash = createHash("sha256")
    .update(token)
    .digest();

  const storedHash = Buffer.from(expectedHash, "hex");

  return timingSafeEqual(actualHash, storedHash);
}