import { z } from "zod";

const emailSchema = z.string().email();
const accountIdentifierSchema = z
  .string()
  .trim()
  .min(3, "Account must be at least 3 characters.")
  .max(64, "Account must be at most 64 characters.")
  .refine((value) => emailSchema.safeParse(value).success || /^[A-Za-z0-9]+$/.test(value), {
    message: "Account can be an email address, or letters and numbers only."
  });

export function normalizeAccountIdentifier(value: unknown) {
  const identifier = accountIdentifierSchema.parse(value);
  return emailSchema.safeParse(identifier).success ? identifier.toLowerCase() : identifier;
}

export function parseAccountCredentials(input: { identifier: unknown; password: unknown }) {
  return {
    identifier: normalizeAccountIdentifier(input.identifier),
    password: z.string().min(6, "Password must be at least 6 characters.").parse(input.password)
  };
}
