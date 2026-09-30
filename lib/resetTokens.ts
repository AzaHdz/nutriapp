import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Password reset tokens on top of Auth.js's VerificationToken model. The
// "reset:" prefix avoids colliding with Resend magic links (which use the bare
// email as the identifier).

const TTL_MS = 60 * 60 * 1000; // 1 hour

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const identifier = (email: string) => `reset:${email}`;

/** Creates a single-use token (invalidating earlier ones) and returns the plain token. */
export async function createResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.deleteMany({
    where: { identifier: identifier(email) },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: identifier(email),
      token: hash(token),
      expires: new Date(Date.now() + TTL_MS),
    },
  });

  return token;
}

/** Validates and consumes the token (single use). Returns false if missing or expired. */
export async function consumeResetToken(email: string, token: string): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: { identifier: identifier(email), token: hash(token) },
    },
  });
  if (!record) return false;

  // Consumed or expired: either way it stops existing
  await prisma.verificationToken.delete({
    where: {
      identifier_token: { identifier: identifier(email), token: hash(token) },
    },
  });

  return record.expires > new Date();
}

/** Absolute reset URL, using the current request's origin. */
export async function resetUrl(email: string, token: string): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}/restablecer?email=${encodeURIComponent(email)}&token=${token}`;
}
