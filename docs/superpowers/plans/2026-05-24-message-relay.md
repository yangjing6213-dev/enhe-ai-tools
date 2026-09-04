# Message Relay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a compliant admin-only message relay MVP where support staff can create authorized tickets, send template-based relay messages with image links, and let users view those messages through expiring token pages with phone-last-four verification.

**Architecture:** Add focused message-relay domain modules instead of expanding the existing large admin action file. Store tickets, templates, messages, attachments, deliveries, access logs, and reviews in Prisma; keep validation, token, rate-limit, and provider behavior in pure helper modules covered by Vitest. Use the existing Next.js App Router, admin layout, Prisma client, audit log helper, and storage helper.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, Vitest, Playwright, Zod, existing local/COS upload storage.

---

## File Structure

- Modify: `prisma/schema.prisma`  
  Add relay enums and models with relations to `User`.
- Create: `prisma/migrations/20260524170000_add_message_relay/migration.sql`  
  Add tables, enums, indexes, and foreign keys matching the schema.
- Create: `src/lib/message-relay-rules.ts`  
  Pure functions for phone masking, last-four validation, token generation, expiry checks, template variable parsing, content validation, and rate-limit decisions.
- Create: `src/lib/message-relay-rules.test.ts`  
  Unit tests for all pure rules.
- Create: `src/lib/message-relay-provider.ts`  
  Provider interface plus deterministic mock SMS provider.
- Create: `src/lib/message-relay-provider.test.ts`  
  Unit tests for mock provider send and webhook parsing.
- Create: `src/lib/message-relay-storage.ts`  
  Image accept rules and attachment access helpers built on the existing storage module.
- Create: `src/lib/message-relay-storage.test.ts`  
  Unit tests for image accept rules and expired attachment access.
- Create: `src/app/admin/message-relay/actions.ts`  
  Server actions for templates, tickets, messages, reviews, and relay image upload.
- Create: `src/app/admin/message-relay/page.tsx`  
  Admin/support ticket list and quick create form.
- Create: `src/app/admin/message-relay/templates/page.tsx`  
  Template management.
- Create: `src/app/admin/message-relay/reviews/page.tsx`  
  Manual review queue.
- Create: `src/app/admin/message-relay/[id]/page.tsx`  
  Ticket detail, message composer, attachments, and activity.
- Create: `src/app/relay/[token]/page.tsx`  
  Public relay access page.
- Create: `src/app/relay/[token]/actions.ts`  
  Last-four verification action for public relay page.
- Create: `src/app/api/message-relay/provider-webhook/route.ts`  
  Mock provider webhook endpoint that updates delivery state.
- Modify: `src/app/admin/layout.tsx`  
  Add message relay navigation.
- Create: `tests/e2e/message-relay.spec.ts`  
  End-to-end coverage for admin template/ticket/message and public token viewing.

## Schema Reference

Use these enum values consistently across Prisma, tests, helpers, and UI:

```prisma
enum MessageRelayTicketStatus {
  open
  closed
  expired
}

enum MessageRelayTemplateStatus {
  draft
  pending_review
  active
  disabled
}

enum MessageRelayMessageStatus {
  draft
  pending_review
  approved
  sent
  failed
  cancelled
}

enum MessageRelayDeliveryStatus {
  pending
  sent
  delivered
  failed
}

enum MessageRelayReviewStatus {
  pending
  approved
  rejected
}
```

---

### Task 1: Domain Rules

**Files:**
- Create: `src/lib/message-relay-rules.test.ts`
- Create: `src/lib/message-relay-rules.ts`

- [ ] **Step 1: Write failing tests for masking, last-four checks, expiry, template variables, content risk, and rate limits**

Create `src/lib/message-relay-rules.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildRelayToken,
  canSendWithinWindow,
  extractTemplateVariables,
  isRelayExpired,
  maskRelayPhone,
  requiresManualReview,
  validateRelaySupplement,
  verifyPhoneLastFour
} from "@/lib/message-relay-rules";

describe("message relay rules", () => {
  it("masks mainland mobile phone numbers", () => {
    expect(maskRelayPhone("13800138000")).toBe("138****8000");
    expect(maskRelayPhone(" 13800138000 ")).toBe("138****8000");
  });

  it("verifies only the phone last four digits", () => {
    expect(verifyPhoneLastFour("13800138000", "8000")).toBe(true);
    expect(verifyPhoneLastFour("13800138000", "0000")).toBe(false);
    expect(verifyPhoneLastFour("13800138000", "80 00")).toBe(false);
  });

  it("treats expired relay windows as unavailable", () => {
    const now = new Date("2026-05-24T12:00:00.000Z");
    expect(isRelayExpired(new Date("2026-05-24T12:00:01.000Z"), now)).toBe(false);
    expect(isRelayExpired(new Date("2026-05-24T11:59:59.000Z"), now)).toBe(true);
  });

  it("extracts unique template variables in declaration order", () => {
    expect(extractTemplateVariables("您好 {{name}}，工单 {{ticket_no}} 已更新，{{name}} 请查看。")).toEqual([
      "name",
      "ticket_no"
    ]);
  });

  it("validates controlled supplement text", () => {
    expect(validateRelaySupplement("请查看附件图片", 30)).toEqual({ ok: true, reason: null });
    expect(validateRelaySupplement("x".repeat(31), 30)).toEqual({ ok: false, reason: "supplement_too_long" });
  });

  it("flags sensitive relay content for manual review", () => {
    expect(requiresManualReview("正常售后说明", ["贷款", "加微信"])).toBe(false);
    expect(requiresManualReview("请加微信处理", ["贷款", "加微信"])).toBe(true);
  });

  it("enforces rate limits with existing counts", () => {
    expect(canSendWithinWindow({ currentCount: 9, limit: 10 })).toEqual({ allowed: true, reason: null });
    expect(canSendWithinWindow({ currentCount: 10, limit: 10 })).toEqual({ allowed: false, reason: "rate_limit_exceeded" });
  });

  it("creates non-guessable URL-safe tokens", () => {
    const token = buildRelayToken();
    expect(token).toMatch(/^[a-zA-Z0-9_-]{43}$/);
  });
});
```

- [ ] **Step 2: Run the failing rule tests**

Run:

```bash
npm test -- src/lib/message-relay-rules.test.ts
```

Expected: FAIL with import errors because `src/lib/message-relay-rules.ts` does not exist.

- [ ] **Step 3: Implement the pure rules**

Create `src/lib/message-relay-rules.ts`:

```ts
import { randomBytes } from "node:crypto";

export function maskRelayPhone(phone: string) {
  const normalized = phone.trim();
  if (normalized.length < 7) return normalized;
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

export function verifyPhoneLastFour(phone: string, input: string) {
  return /^\d{4}$/.test(input) && phone.trim().endsWith(input);
}

export function isRelayExpired(expiresAt: Date, now = new Date()) {
  return expiresAt.getTime() <= now.getTime();
}

export function extractTemplateVariables(content: string) {
  const names: string[] = [];
  for (const match of content.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g)) {
    const name = match[1];
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

export function renderRelayTemplate(content: string, variables: Record<string, string>) {
  return content.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g, (_, name: string) => variables[name] ?? "");
}

export function validateRelaySupplement(text: string | null | undefined, maxLength = 200) {
  const value = text?.trim() ?? "";
  if (value.length > maxLength) return { ok: false as const, reason: "supplement_too_long" as const };
  return { ok: true as const, reason: null };
}

export function requiresManualReview(text: string, sensitiveWords: string[]) {
  const normalized = text.toLowerCase();
  return sensitiveWords.some((word) => word.trim() && normalized.includes(word.trim().toLowerCase()));
}

export function canSendWithinWindow(input: { currentCount: number; limit: number }) {
  if (input.currentCount >= input.limit) {
    return { allowed: false as const, reason: "rate_limit_exceeded" as const };
  }
  return { allowed: true as const, reason: null };
}

export function buildRelayToken() {
  return randomBytes(32).toString("base64url");
}

export function buildRelayExpiry(now = new Date(), days = 7) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
```

- [ ] **Step 4: Run the rule tests until green**

Run:

```bash
npm test -- src/lib/message-relay-rules.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add src/lib/message-relay-rules.ts src/lib/message-relay-rules.test.ts
git commit -m "feat: add message relay domain rules"
```

---

### Task 2: Database Schema And Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260524170000_add_message_relay/migration.sql`

- [ ] **Step 1: Add failing schema references to Prisma models**

Append the schema below to `prisma/schema.prisma`, and add these relation fields inside `model User`:

```prisma
  relayTicketsCreated   MessageRelayTicket[] @relation("RelayTicketCreator")
  relayTicketsAssigned  MessageRelayTicket[] @relation("RelayTicketAssignee")
  relayTemplatesCreated MessageRelayTemplate[] @relation("RelayTemplateCreator")
  relayMessagesCreated  MessageRelayMessage[] @relation("RelayMessageCreator")
  relayReviewsReviewed  MessageRelayReview[] @relation("RelayReviewReviewer")
```

Append this block after the existing models:

```prisma
enum MessageRelayTicketStatus {
  open
  closed
  expired
}

enum MessageRelayTemplateStatus {
  draft
  pending_review
  active
  disabled
}

enum MessageRelayMessageStatus {
  draft
  pending_review
  approved
  sent
  failed
  cancelled
}

enum MessageRelayDeliveryStatus {
  pending
  sent
  delivered
  failed
}

enum MessageRelayReviewStatus {
  pending
  approved
  rejected
}

model MessageRelayTicket {
  id                  String                   @id @default(cuid())
  businessType        String                   @map("business_type")
  externalBusinessId  String                   @map("external_business_id")
  userPhone           String                   @map("user_phone")
  authorizationSource String                   @map("authorization_source")
  authorizedAt        DateTime                 @map("authorized_at")
  contactExpiresAt    DateTime                 @map("contact_expires_at")
  status              MessageRelayTicketStatus @default(open)
  closeReason         String?                  @map("close_reason")
  createdById         String                   @map("created_by_id")
  assignedToId        String?                  @map("assigned_to_id")
  createdAt           DateTime                 @default(now()) @map("created_at")
  updatedAt           DateTime                 @updatedAt @map("updated_at")
  createdBy           User                     @relation("RelayTicketCreator", fields: [createdById], references: [id])
  assignedTo          User?                    @relation("RelayTicketAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  messages            MessageRelayMessage[]

  @@index([status, contactExpiresAt])
  @@index([createdById, createdAt])
  @@index([assignedToId, createdAt])
  @@index([externalBusinessId])
  @@map("message_relay_tickets")
}

model MessageRelayTemplate {
  id           String                     @id @default(cuid())
  name         String
  content      String
  variables    String[]                   @default([])
  status       MessageRelayTemplateStatus @default(draft)
  createdById  String                     @map("created_by_id")
  createdAt    DateTime                   @default(now()) @map("created_at")
  updatedAt    DateTime                   @updatedAt @map("updated_at")
  createdBy    User                       @relation("RelayTemplateCreator", fields: [createdById], references: [id])
  messages     MessageRelayMessage[]

  @@index([status, createdAt])
  @@map("message_relay_templates")
}

model MessageRelayMessage {
  id             String                    @id @default(cuid())
  ticketId       String                    @map("ticket_id")
  templateId     String                    @map("template_id")
  createdById    String                    @map("created_by_id")
  variables      Json
  supplement     String?
  renderedContent String                   @map("rendered_content")
  tokenHash      String                    @unique @map("token_hash")
  tokenPreview   String                    @map("token_preview")
  expiresAt      DateTime                  @map("expires_at")
  status         MessageRelayMessageStatus @default(draft)
  reviewReason   String?                   @map("review_reason")
  sentAt         DateTime?                 @map("sent_at")
  createdAt      DateTime                  @default(now()) @map("created_at")
  updatedAt      DateTime                  @updatedAt @map("updated_at")
  ticket         MessageRelayTicket        @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  template       MessageRelayTemplate      @relation(fields: [templateId], references: [id])
  createdBy      User                      @relation("RelayMessageCreator", fields: [createdById], references: [id])
  attachments    MessageRelayAttachment[]
  deliveries     MessageRelayDelivery[]
  accessLogs     MessageRelayAccessLog[]
  reviews        MessageRelayReview[]

  @@index([ticketId, createdAt])
  @@index([status, createdAt])
  @@index([expiresAt])
  @@map("message_relay_messages")
}

model MessageRelayAttachment {
  id        String              @id @default(cuid())
  messageId String              @map("message_id")
  fileName  String              @map("file_name")
  filePath  String              @map("file_path")
  fileUrl   String?             @map("file_url")
  fileSize  BigInt              @map("file_size")
  mimeType  String              @map("mime_type")
  status    ContentStatus       @default(active)
  createdAt DateTime            @default(now()) @map("created_at")
  message   MessageRelayMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId])
  @@map("message_relay_attachments")
}

model MessageRelayDelivery {
  id                String                     @id @default(cuid())
  messageId          String                     @map("message_id")
  provider           String
  providerMessageId  String?                    @map("provider_message_id")
  status             MessageRelayDeliveryStatus @default(pending)
  failureReason      String?                    @map("failure_reason")
  raw                Json?
  createdAt          DateTime                   @default(now()) @map("created_at")
  updatedAt          DateTime                   @updatedAt @map("updated_at")
  message            MessageRelayMessage        @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId, status])
  @@index([providerMessageId])
  @@map("message_relay_deliveries")
}

model MessageRelayAccessLog {
  id        String              @id @default(cuid())
  messageId String              @map("message_id")
  success   Boolean
  reason    String?
  ip        String?
  userAgent String?             @map("user_agent")
  createdAt DateTime            @default(now()) @map("created_at")
  message   MessageRelayMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@index([messageId, createdAt])
  @@map("message_relay_access_logs")
}

model MessageRelayReview {
  id           String                   @id @default(cuid())
  messageId    String                   @map("message_id")
  status       MessageRelayReviewStatus @default(pending)
  reason       String
  reviewerId   String?                  @map("reviewer_id")
  reviewedAt   DateTime?                @map("reviewed_at")
  reviewNote   String?                  @map("review_note")
  createdAt    DateTime                 @default(now()) @map("created_at")
  updatedAt    DateTime                 @updatedAt @map("updated_at")
  message      MessageRelayMessage      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  reviewer     User?                    @relation("RelayReviewReviewer", fields: [reviewerId], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
  @@index([messageId])
  @@map("message_relay_reviews")
}
```

- [ ] **Step 2: Run Prisma validation and capture the expected missing migration state**

Run:

```bash
npx prisma validate
```

Expected: PASS if relations are correct. If it fails, fix relation names before writing the migration.

- [ ] **Step 3: Create SQL migration**

Create `prisma/migrations/20260524170000_add_message_relay/migration.sql` with SQL matching the models:

```sql
CREATE TYPE "MessageRelayTicketStatus" AS ENUM ('open', 'closed', 'expired');
CREATE TYPE "MessageRelayTemplateStatus" AS ENUM ('draft', 'pending_review', 'active', 'disabled');
CREATE TYPE "MessageRelayMessageStatus" AS ENUM ('draft', 'pending_review', 'approved', 'sent', 'failed', 'cancelled');
CREATE TYPE "MessageRelayDeliveryStatus" AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE "MessageRelayReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE "message_relay_tickets" (
  "id" TEXT NOT NULL,
  "business_type" TEXT NOT NULL,
  "external_business_id" TEXT NOT NULL,
  "user_phone" TEXT NOT NULL,
  "authorization_source" TEXT NOT NULL,
  "authorized_at" TIMESTAMP(3) NOT NULL,
  "contact_expires_at" TIMESTAMP(3) NOT NULL,
  "status" "MessageRelayTicketStatus" NOT NULL DEFAULT 'open',
  "close_reason" TEXT,
  "created_by_id" TEXT NOT NULL,
  "assigned_to_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "message_relay_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_relay_templates" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "MessageRelayTemplateStatus" NOT NULL DEFAULT 'draft',
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "message_relay_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_relay_messages" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "variables" JSONB NOT NULL,
  "supplement" TEXT,
  "rendered_content" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "token_preview" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "status" "MessageRelayMessageStatus" NOT NULL DEFAULT 'draft',
  "review_reason" TEXT,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "message_relay_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_relay_attachments" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_url" TEXT,
  "file_size" BIGINT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_relay_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_relay_deliveries" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_message_id" TEXT,
  "status" "MessageRelayDeliveryStatus" NOT NULL DEFAULT 'pending',
  "failure_reason" TEXT,
  "raw" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "message_relay_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_relay_access_logs" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT,
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "message_relay_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "message_relay_reviews" (
  "id" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "status" "MessageRelayReviewStatus" NOT NULL DEFAULT 'pending',
  "reason" TEXT NOT NULL,
  "reviewer_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "review_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "message_relay_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "message_relay_messages_token_hash_key" ON "message_relay_messages"("token_hash");
CREATE INDEX "message_relay_tickets_status_contact_expires_at_idx" ON "message_relay_tickets"("status", "contact_expires_at");
CREATE INDEX "message_relay_tickets_created_by_id_created_at_idx" ON "message_relay_tickets"("created_by_id", "created_at");
CREATE INDEX "message_relay_tickets_assigned_to_id_created_at_idx" ON "message_relay_tickets"("assigned_to_id", "created_at");
CREATE INDEX "message_relay_tickets_external_business_id_idx" ON "message_relay_tickets"("external_business_id");
CREATE INDEX "message_relay_templates_status_created_at_idx" ON "message_relay_templates"("status", "created_at");
CREATE INDEX "message_relay_messages_ticket_id_created_at_idx" ON "message_relay_messages"("ticket_id", "created_at");
CREATE INDEX "message_relay_messages_status_created_at_idx" ON "message_relay_messages"("status", "created_at");
CREATE INDEX "message_relay_messages_expires_at_idx" ON "message_relay_messages"("expires_at");
CREATE INDEX "message_relay_attachments_message_id_idx" ON "message_relay_attachments"("message_id");
CREATE INDEX "message_relay_deliveries_message_id_status_idx" ON "message_relay_deliveries"("message_id", "status");
CREATE INDEX "message_relay_deliveries_provider_message_id_idx" ON "message_relay_deliveries"("provider_message_id");
CREATE INDEX "message_relay_access_logs_message_id_created_at_idx" ON "message_relay_access_logs"("message_id", "created_at");
CREATE INDEX "message_relay_reviews_status_created_at_idx" ON "message_relay_reviews"("status", "created_at");
CREATE INDEX "message_relay_reviews_message_id_idx" ON "message_relay_reviews"("message_id");

ALTER TABLE "message_relay_tickets" ADD CONSTRAINT "message_relay_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_relay_tickets" ADD CONSTRAINT "message_relay_tickets_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "message_relay_templates" ADD CONSTRAINT "message_relay_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_relay_messages" ADD CONSTRAINT "message_relay_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "message_relay_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_relay_messages" ADD CONSTRAINT "message_relay_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_relay_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_relay_messages" ADD CONSTRAINT "message_relay_messages_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "message_relay_attachments" ADD CONSTRAINT "message_relay_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message_relay_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_relay_deliveries" ADD CONSTRAINT "message_relay_deliveries_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message_relay_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_relay_access_logs" ADD CONSTRAINT "message_relay_access_logs_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message_relay_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_relay_reviews" ADD CONSTRAINT "message_relay_reviews_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message_relay_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_relay_reviews" ADD CONSTRAINT "message_relay_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 4: Generate Prisma client**

Run:

```bash
npx prisma generate
```

Expected: Prisma client generated without schema errors.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add prisma/schema.prisma prisma/migrations/20260524170000_add_message_relay/migration.sql
git commit -m "feat: add message relay schema"
```

---

### Task 3: Provider And Attachment Storage Helpers

**Files:**
- Create: `src/lib/message-relay-provider.test.ts`
- Create: `src/lib/message-relay-provider.ts`
- Create: `src/lib/message-relay-storage.test.ts`
- Create: `src/lib/message-relay-storage.ts`

- [ ] **Step 1: Write failing provider tests**

Create `src/lib/message-relay-provider.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createMockRelaySmsProvider } from "@/lib/message-relay-provider";

describe("message relay provider", () => {
  it("returns deterministic mock message ids", async () => {
    const provider = createMockRelaySmsProvider();
    const result = await provider.sendTemplateSms({
      phone: "13800138000",
      templateCode: "relay_notice",
      variables: { link: "https://example.com/relay/token" },
      outId: "msg_123"
    });

    expect(result.providerMessageId).toBe("mock-msg_123");
    expect(result.raw).toEqual({
      provider: "mock",
      phoneMasked: "138****8000",
      templateCode: "relay_notice",
      variables: { link: "https://example.com/relay/token" }
    });
  });
});
```

- [ ] **Step 2: Write failing storage tests**

Create `src/lib/message-relay-storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { canViewRelayAttachment, isRelayImageFileAccepted } from "@/lib/message-relay-storage";

function file(name: string, type: string, size: number) {
  return { name, type, size } as File;
}

describe("message relay storage", () => {
  it("accepts only image files within size limit", () => {
    expect(isRelayImageFileAccepted(file("a.png", "image/png", 1024))).toBe(true);
    expect(isRelayImageFileAccepted(file("a.pdf", "application/pdf", 1024))).toBe(false);
    expect(isRelayImageFileAccepted(file("a.png", "image/png", 6 * 1024 * 1024))).toBe(false);
  });

  it("blocks attachment viewing after relay expiry", () => {
    const now = new Date("2026-05-24T12:00:00.000Z");
    expect(canViewRelayAttachment({ messageExpiresAt: new Date("2026-05-24T12:00:01.000Z"), now })).toBe(true);
    expect(canViewRelayAttachment({ messageExpiresAt: new Date("2026-05-24T11:59:59.000Z"), now })).toBe(false);
  });
});
```

- [ ] **Step 3: Run failing helper tests**

Run:

```bash
npm test -- src/lib/message-relay-provider.test.ts src/lib/message-relay-storage.test.ts
```

Expected: FAIL with import errors.

- [ ] **Step 4: Implement provider and storage helpers**

Create `src/lib/message-relay-provider.ts`:

```ts
import { maskRelayPhone } from "@/lib/message-relay-rules";

export type RelaySmsProvider = {
  name: string;
  sendTemplateSms(input: {
    phone: string;
    templateCode: string;
    variables: Record<string, string>;
    outId: string;
  }): Promise<{ providerMessageId: string; raw: unknown }>;
};

export function createMockRelaySmsProvider(): RelaySmsProvider {
  return {
    name: "mock",
    async sendTemplateSms(input) {
      return {
        providerMessageId: `mock-${input.outId}`,
        raw: {
          provider: "mock",
          phoneMasked: maskRelayPhone(input.phone),
          templateCode: input.templateCode,
          variables: input.variables
        }
      };
    }
  };
}
```

Create `src/lib/message-relay-storage.ts`:

```ts
import { isRelayExpired } from "@/lib/message-relay-rules";

export const relayImageMaxBytes = 5 * 1024 * 1024;
export const relayImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export function isRelayImageFileAccepted(file: File) {
  return relayImageMimeTypes.includes(file.type as (typeof relayImageMimeTypes)[number]) && file.size > 0 && file.size <= relayImageMaxBytes;
}

export function canViewRelayAttachment(input: { messageExpiresAt: Date; now?: Date }) {
  return !isRelayExpired(input.messageExpiresAt, input.now ?? new Date());
}
```

- [ ] **Step 5: Run helper tests until green**

Run:

```bash
npm test -- src/lib/message-relay-provider.test.ts src/lib/message-relay-storage.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 3**

Run:

```bash
git add src/lib/message-relay-provider.ts src/lib/message-relay-provider.test.ts src/lib/message-relay-storage.ts src/lib/message-relay-storage.test.ts
git commit -m "feat: add message relay provider and storage helpers"
```

---

### Task 4: Admin Actions For Templates, Tickets, Messages, Reviews, And Uploads

**Files:**
- Create: `src/app/admin/message-relay/actions.ts`
- Create: `src/app/admin/message-relay/actions.test.ts`

- [ ] **Step 1: Write action parser tests**

Create `src/app/admin/message-relay/actions.test.ts` with tests for exported pure parsers from the action file:

```ts
import { describe, expect, it } from "vitest";
import {
  parseRelayMessageVariables,
  parseRelayTemplateInput,
  parseRelayTicketInput
} from "@/app/admin/message-relay/actions";

describe("message relay admin action parsing", () => {
  it("parses template content variables", () => {
    const form = new FormData();
    form.set("name", "售后提醒");
    form.set("content", "您好 {{name}}，请查看 {{link}}");
    form.set("status", "active");

    expect(parseRelayTemplateInput(form, "admin_1")).toEqual({
      name: "售后提醒",
      content: "您好 {{name}}，请查看 {{link}}",
      variables: ["name", "link"],
      status: "active",
      createdById: "admin_1"
    });
  });

  it("requires ticket authorization fields", () => {
    const form = new FormData();
    form.set("businessType", "售后");
    form.set("externalBusinessId", "SO-1");
    form.set("userPhone", "13800138000");
    form.set("authorizationSource", "用户提交售后表单");
    form.set("authorizedAt", "2026-05-24");
    form.set("contactExpiresAt", "2026-05-31");

    expect(parseRelayTicketInput(form, "admin_1")).toMatchObject({
      businessType: "售后",
      externalBusinessId: "SO-1",
      userPhone: "13800138000",
      authorizationSource: "用户提交售后表单",
      createdById: "admin_1"
    });
  });

  it("parses relay message variables from JSON", () => {
    const form = new FormData();
    form.set("variablesJson", "{\"name\":\"张三\",\"link\":\"演示链接\"}");

    expect(parseRelayMessageVariables(form)).toEqual({ name: "张三", link: "演示链接" });
  });
});
```

- [ ] **Step 2: Run parser tests and verify they fail**

Run:

```bash
npm test -- src/app/admin/message-relay/actions.test.ts
```

Expected: FAIL because `actions.ts` does not exist.

- [ ] **Step 3: Implement action file with pure parsers and server actions**

Create `src/app/admin/message-relay/actions.ts` with this structure:

```ts
"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { writeAdminAuditLog } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseOptionalString } from "@/lib/admin-form";
import {
  buildRelayExpiry,
  buildRelayToken,
  extractTemplateVariables,
  renderRelayTemplate,
  requiresManualReview,
  validateRelaySupplement
} from "@/lib/message-relay-rules";
import { createMockRelaySmsProvider } from "@/lib/message-relay-provider";
import { isRelayImageFileAccepted } from "@/lib/message-relay-storage";
import { saveUploadedFile } from "@/lib/storage";

const idSchema = z.string().min(1);
const relaySensitiveWords = ["加微信", "贷款", "返利", "中奖"];

export function hashRelayToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseRelayTemplateInput(formData: FormData, adminId: string) {
  const content = z.string().min(1).parse(formData.get("content"));
  return {
    name: z.string().min(1).parse(formData.get("name")),
    content,
    variables: extractTemplateVariables(content),
    status: z.enum(["draft", "pending_review", "active", "disabled"]).parse(formData.get("status") ?? "draft"),
    createdById: adminId
  };
}

export function parseRelayTicketInput(formData: FormData, adminId: string) {
  return {
    businessType: z.string().min(1).parse(formData.get("businessType")),
    externalBusinessId: z.string().min(1).parse(formData.get("externalBusinessId")),
    userPhone: z.string().regex(/^1\d{10}$/).parse(formData.get("userPhone")),
    authorizationSource: z.string().min(2).parse(formData.get("authorizationSource")),
    authorizedAt: new Date(`${z.string().min(10).parse(formData.get("authorizedAt"))}T00:00:00`),
    contactExpiresAt: new Date(`${z.string().min(10).parse(formData.get("contactExpiresAt"))}T23:59:59`),
    assignedToId: parseOptionalString(formData.get("assignedToId")),
    createdById: adminId
  };
}

export function parseRelayMessageVariables(formData: FormData) {
  const raw = z.string().min(2).parse(formData.get("variablesJson"));
  return z.record(z.string()).parse(JSON.parse(raw));
}

export async function upsertRelayTemplateAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = parseOptionalString(formData.get("id"));
  const input = parseRelayTemplateInput(formData, admin.id);
  const template = id
    ? await prisma.messageRelayTemplate.update({ where: { id }, data: input })
    : await prisma.messageRelayTemplate.create({ data: input });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: id ? "message_relay.template.update" : "message_relay.template.create",
    targetType: "message_relay_template",
    targetId: template.id,
    summary: id ? "Updated message relay template." : "Created message relay template.",
    metadata: { name: template.name, status: template.status, variables: template.variables }
  });

  revalidatePath("/admin/message-relay/templates");
  redirect("/admin/message-relay/templates?saved=1");
}

export async function createRelayTicketAction(formData: FormData) {
  const admin = await requireAdmin();
  const input = parseRelayTicketInput(formData, admin.id);
  if (input.contactExpiresAt.getTime() <= Date.now()) throw new Error("联系有效期必须晚于当前时间。");
  const ticket = await prisma.messageRelayTicket.create({ data: input });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "message_relay.ticket.create",
    targetType: "message_relay_ticket",
    targetId: ticket.id,
    summary: "Created message relay ticket.",
    metadata: { businessType: ticket.businessType, externalBusinessId: ticket.externalBusinessId }
  });

  revalidatePath("/admin/message-relay");
  redirect(`/admin/message-relay/${ticket.id}`);
}

export async function createRelayMessageAction(formData: FormData) {
  const admin = await requireAdmin();
  const ticketId = idSchema.parse(formData.get("ticketId"));
  const templateId = idSchema.parse(formData.get("templateId"));
  const variables = parseRelayMessageVariables(formData);
  const supplement = parseOptionalString(formData.get("supplement"));
  const supplementValidation = validateRelaySupplement(supplement, 200);
  if (!supplementValidation.ok) throw new Error("补充说明不能超过 200 字。");

  const [ticket, template] = await Promise.all([
    prisma.messageRelayTicket.findUnique({ where: { id: ticketId } }),
    prisma.messageRelayTemplate.findUnique({ where: { id: templateId } })
  ]);
  if (!ticket || ticket.status !== "open") throw new Error("工单不存在或已关闭。");
  if (!template || template.status !== "active") throw new Error("模板不存在或未启用。");

  const renderedContent = [renderRelayTemplate(template.content, variables), supplement].filter(Boolean).join("\n");
  const token = buildRelayToken();
  const tokenHash = hashRelayToken(token);
  const reviewRequired = requiresManualReview(renderedContent, relaySensitiveWords);
  const message = await prisma.messageRelayMessage.create({
    data: {
      ticketId,
      templateId,
      createdById: admin.id,
      variables: variables as Prisma.InputJsonValue,
      supplement,
      renderedContent,
      tokenHash,
      tokenPreview: token.slice(0, 8),
      expiresAt: buildRelayExpiry(),
      status: reviewRequired ? "pending_review" : "sent",
      reviewReason: reviewRequired ? "sensitive_word" : null,
      sentAt: reviewRequired ? null : new Date()
    }
  });

  if (reviewRequired) {
    await prisma.messageRelayReview.create({
      data: { messageId: message.id, reason: "sensitive_word" }
    });
  } else {
    const provider = createMockRelaySmsProvider();
    const delivery = await provider.sendTemplateSms({
      phone: ticket.userPhone,
      templateCode: "relay_notice",
      variables: { link: `/relay/${token}` },
      outId: message.id
    });
    await prisma.messageRelayDelivery.create({
      data: {
        messageId: message.id,
        provider: provider.name,
        providerMessageId: delivery.providerMessageId,
        status: "sent",
        raw: delivery.raw as Prisma.InputJsonValue
      }
    });
  }

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "message_relay.message.create",
    targetType: "message_relay_message",
    targetId: message.id,
    summary: reviewRequired ? "Created relay message pending review." : "Created and sent relay message.",
    metadata: { ticketId, templateId, reviewRequired }
  });

  revalidatePath(`/admin/message-relay/${ticketId}`);
  redirect(`/admin/message-relay/${ticketId}?message=${reviewRequired ? "review" : "sent"}`);
}

export async function uploadRelayAttachmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const messageId = idSchema.parse(formData.get("messageId"));
  const file = formData.get("file");
  if (!(file instanceof File) || !isRelayImageFileAccepted(file)) throw new Error("请上传 5MB 以内的 jpg、png 或 webp 图片。");

  const stored = await saveUploadedFile(file, {
    folder: "message-relay",
    maxBytes: 5 * 1024 * 1024,
    accept: isRelayImageFileAccepted,
    invalidTypeMessage: "请上传 jpg、png 或 webp 图片。"
  });
  const attachment = await prisma.messageRelayAttachment.create({
    data: {
      messageId,
      fileName: stored.fileName,
      filePath: stored.filePath,
      fileUrl: stored.fileUrl,
      fileSize: BigInt(stored.fileSize),
      mimeType: stored.mimeType
    }
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "message_relay.attachment.upload",
    targetType: "message_relay_attachment",
    targetId: attachment.id,
    summary: "Uploaded relay image attachment.",
    metadata: { messageId, fileName: stored.fileName, fileSize: stored.fileSize }
  });

  revalidatePath("/admin/message-relay");
}

export async function reviewRelayMessageAction(formData: FormData) {
  const admin = await requireAdmin();
  const reviewId = idSchema.parse(formData.get("reviewId"));
  const status = z.enum(["approved", "rejected"]).parse(formData.get("status"));
  const reviewNote = parseOptionalString(formData.get("reviewNote"));

  const review = await prisma.messageRelayReview.update({
    where: { id: reviewId },
    data: { status, reviewerId: admin.id, reviewedAt: new Date(), reviewNote },
    include: { message: true }
  });
  await prisma.messageRelayMessage.update({
    where: { id: review.messageId },
    data: { status: status === "approved" ? "approved" : "cancelled" }
  });

  await writeAdminAuditLog({
    adminId: admin.id,
    action: "message_relay.review.process",
    targetType: "message_relay_review",
    targetId: reviewId,
    summary: "Processed message relay review.",
    metadata: { status, messageId: review.messageId, reviewNote }
  });

  revalidatePath("/admin/message-relay/reviews");
  revalidatePath(`/admin/message-relay/${review.message.ticketId}`);
  redirect("/admin/message-relay/reviews?reviewed=1");
}
```

- [ ] **Step 4: Run parser tests until green**

Run:

```bash
npm test -- src/app/admin/message-relay/actions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add src/app/admin/message-relay/actions.ts src/app/admin/message-relay/actions.test.ts
git commit -m "feat: add message relay admin actions"
```

---

### Task 5: Admin UI

**Files:**
- Modify: `src/app/admin/layout.tsx`
- Create: `src/app/admin/message-relay/page.tsx`
- Create: `src/app/admin/message-relay/templates/page.tsx`
- Create: `src/app/admin/message-relay/reviews/page.tsx`
- Create: `src/app/admin/message-relay/[id]/page.tsx`

- [ ] **Step 1: Add admin navigation**

Modify `src/app/admin/layout.tsx` by adding this entry to `adminNav` near other operations links:

```ts
["传话工单", "/admin/message-relay"],
```

- [ ] **Step 2: Create ticket list and create page**

Create `src/app/admin/message-relay/page.tsx`:

```tsx
import Link from "next/link";
import { AdminSection, Field, inputClass, selectClass, SubmitButton } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { createRelayTicketAction } from "@/app/admin/message-relay/actions";
import { maskRelayPhone } from "@/lib/message-relay-rules";

export default async function MessageRelayPage() {
  const [tickets, admins] = await Promise.all([
    prisma.messageRelayTicket.findMany({
      include: { assignedTo: true, createdBy: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.user.findMany({ where: { role: "admin", status: "active" }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <AdminSection title="传话工单" intro="基于业务授权创建传话工单，保护客服和用户真实手机号。">
      <form action={createRelayTicketAction} className="glass grid gap-4 rounded-2xl p-6 md:grid-cols-2">
        <Field label="业务类型"><input name="businessType" required className={inputClass} placeholder="售后 / 咨询 / 预约" /></Field>
        <Field label="外部业务 ID"><input name="externalBusinessId" required className={inputClass} placeholder="订单号或咨询编号" /></Field>
        <Field label="用户手机号"><input name="userPhone" required className={inputClass} placeholder="13800138000" /></Field>
        <Field label="授权来源"><input name="authorizationSource" required className={inputClass} placeholder="用户提交售后表单" /></Field>
        <Field label="授权时间"><input name="authorizedAt" type="date" required className={inputClass} /></Field>
        <Field label="联系有效期"><input name="contactExpiresAt" type="date" required className={inputClass} /></Field>
        <Field label="处理客服">
          <select name="assignedToId" className={selectClass}>
            <option value="">暂不分配</option>
            {admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.nickname ?? admin.email ?? admin.phone ?? admin.id}</option>)}
          </select>
        </Field>
        <div className="flex items-end"><SubmitButton>创建工单</SubmitButton></div>
      </form>

      <div className="mt-8 space-y-3">
        {tickets.map((ticket) => (
          <Link key={ticket.id} href={`/admin/message-relay/${ticket.id}`} className="glass block rounded-2xl p-5 transition hover:border-[#48F5D3]/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[#E8EEF8]">{ticket.businessType} · {ticket.externalBusinessId}</p>
                <p className="mt-2 text-sm text-[#8B95A7]">{maskRelayPhone(ticket.userPhone)} · {ticket.authorizationSource}</p>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#8B95A7]">{ticket.status}</span>
            </div>
          </Link>
        ))}
      </div>
    </AdminSection>
  );
}
```

- [ ] **Step 3: Create template management page**

Create `src/app/admin/message-relay/templates/page.tsx` with a create form and list:

```tsx
import { AdminSection, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { upsertRelayTemplateAction } from "@/app/admin/message-relay/actions";

export default async function RelayTemplatesPage() {
  const templates = await prisma.messageRelayTemplate.findMany({ orderBy: { createdAt: "desc" }, take: 50 });

  return (
    <AdminSection title="传话模板" intro="客服只能使用已启用模板创建传话内容。">
      <form action={upsertRelayTemplateAction} className="glass grid gap-4 rounded-2xl p-6">
        <Field label="模板名称"><input name="name" required className={inputClass} /></Field>
        <Field label="模板内容"><textarea name="content" required className={textareaClass} placeholder="您好 {{name}}，您的工单 {{ticket_no}} 已更新。" /></Field>
        <Field label="状态">
          <select name="status" className={selectClass} defaultValue="active">
            <option value="draft">草稿</option>
            <option value="pending_review">待审核</option>
            <option value="active">已启用</option>
            <option value="disabled">已停用</option>
          </select>
        </Field>
        <SubmitButton>保存模板</SubmitButton>
      </form>

      <div className="mt-8 space-y-3">
        {templates.map((template) => (
          <div key={template.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <p className="font-semibold text-[#E8EEF8]">{template.name}</p>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#8B95A7]">{template.status}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#8B95A7]">{template.content}</p>
            <p className="mt-3 text-xs text-[#8B95A7]">变量：{template.variables.join(", ") || "无"}</p>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}
```

- [ ] **Step 4: Create review queue page**

Create `src/app/admin/message-relay/reviews/page.tsx`:

```tsx
import { AdminSection, Field, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { reviewRelayMessageAction } from "@/app/admin/message-relay/actions";

export default async function RelayReviewsPage() {
  const reviews = await prisma.messageRelayReview.findMany({
    where: { status: "pending" },
    include: { message: { include: { ticket: true } } },
    orderBy: { createdAt: "asc" }
  });

  return (
    <AdminSection title="传话复核" intro="敏感词或异常频率命中的内容需要管理员复核。">
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="glass rounded-2xl p-5">
            <p className="font-semibold text-[#E8EEF8]">{review.message.ticket.businessType} · {review.message.ticket.externalBusinessId}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#8B95A7]">{review.message.renderedContent}</p>
            <p className="mt-3 text-xs text-[#FFB86B]">命中原因：{review.reason}</p>
            <form action={reviewRelayMessageAction} className="mt-4 grid gap-3 md:grid-cols-[160px_1fr_auto]">
              <input type="hidden" name="reviewId" value={review.id} />
              <select name="status" className={selectClass}>
                <option value="approved">通过</option>
                <option value="rejected">拒绝</option>
              </select>
              <Field label="复核备注"><textarea name="reviewNote" className={textareaClass} /></Field>
              <div className="flex items-end"><SubmitButton>提交复核</SubmitButton></div>
            </form>
          </div>
        ))}
        {!reviews.length ? <div className="glass rounded-2xl p-8 text-sm text-[#8B95A7]">当前没有待复核内容。</div> : null}
      </div>
    </AdminSection>
  );
}
```

- [ ] **Step 5: Create ticket detail and composer page**

Create `src/app/admin/message-relay/[id]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { AdminSection, Field, inputClass, selectClass, SubmitButton, textareaClass } from "@/app/admin/admin-ui";
import { prisma } from "@/lib/db";
import { createRelayMessageAction, uploadRelayAttachmentAction } from "@/app/admin/message-relay/actions";
import { maskRelayPhone } from "@/lib/message-relay-rules";

export default async function RelayTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ticket, templates] = await Promise.all([
    prisma.messageRelayTicket.findUnique({
      where: { id },
      include: {
        messages: {
          include: { attachments: true, deliveries: true, accessLogs: true, reviews: true },
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    prisma.messageRelayTemplate.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" } })
  ]);
  if (!ticket) notFound();

  return (
    <AdminSection title={`${ticket.businessType} · ${ticket.externalBusinessId}`} intro={`${maskRelayPhone(ticket.userPhone)} · 授权来源：${ticket.authorizationSource}`}>
      <form action={createRelayMessageAction} className="glass grid gap-4 rounded-2xl p-6">
        <input type="hidden" name="ticketId" value={ticket.id} />
        <Field label="模板">
          <select name="templateId" className={selectClass} required>
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </select>
        </Field>
        <Field label="变量 JSON"><textarea name="variablesJson" required className={textareaClass} defaultValue={"{}"} /></Field>
        <Field label="补充说明"><textarea name="supplement" className={textareaClass} maxLength={200} /></Field>
        <SubmitButton>生成传话并发送提醒</SubmitButton>
      </form>

      <div className="mt-8 space-y-4">
        {ticket.messages.map((message) => (
          <div key={message.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <p className="font-semibold text-[#E8EEF8]">{message.status}</p>
              <p className="text-xs text-[#8B95A7]">过期：{message.expiresAt.toLocaleString("zh-CN")}</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#8B95A7]">{message.renderedContent}</p>
            <form action={uploadRelayAttachmentAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="messageId" value={message.id} />
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp" className={inputClass} />
              <button className="rounded-full border border-white/12 px-5 py-3 text-sm font-semibold text-[#E8EEF8]">上传图片</button>
            </form>
            <p className="mt-3 text-xs text-[#8B95A7]">
              附件 {message.attachments.length} · 发送 {message.deliveries.length} · 访问 {message.accessLogs.length} · 复核 {message.reviews.length}
            </p>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}
```

- [ ] **Step 6: Run typecheck after UI pages**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

Run:

```bash
git add src/app/admin/layout.tsx src/app/admin/message-relay
git commit -m "feat: add message relay admin UI"
```

---

### Task 6: Public Relay Page And Provider Webhook

**Files:**
- Create: `src/app/relay/[token]/actions.ts`
- Create: `src/app/relay/[token]/page.tsx`
- Create: `src/app/api/message-relay/provider-webhook/route.ts`

- [ ] **Step 1: Create public verification action**

Create `src/app/relay/[token]/actions.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { isRelayExpired, verifyPhoneLastFour } from "@/lib/message-relay-rules";

export function hashPublicRelayToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyRelayAccessAction(token: string, formData: FormData) {
  const headerStore = await headers();
  const lastFour = String(formData.get("lastFour") ?? "");
  const tokenHash = hashPublicRelayToken(token);
  const message = await prisma.messageRelayMessage.findUnique({
    where: { tokenHash },
    include: { ticket: true }
  });

  const context = {
    ip: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent")
  };

  if (!message) return { ok: false, reason: "not_found" };
  if (isRelayExpired(message.expiresAt)) {
    await prisma.messageRelayAccessLog.create({ data: { messageId: message.id, success: false, reason: "expired", ...context } });
    return { ok: false, reason: "expired" };
  }
  if (!verifyPhoneLastFour(message.ticket.userPhone, lastFour)) {
    await prisma.messageRelayAccessLog.create({ data: { messageId: message.id, success: false, reason: "last_four_mismatch", ...context } });
    return { ok: false, reason: "last_four_mismatch" };
  }

  await prisma.messageRelayAccessLog.create({ data: { messageId: message.id, success: true, reason: null, ...context } });
  return { ok: true, reason: null };
}
```

- [ ] **Step 2: Create public relay page**

Create `src/app/relay/[token]/page.tsx`:

```tsx
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { prisma } from "@/lib/db";
import { isRelayExpired } from "@/lib/message-relay-rules";
import { verifyRelayAccessAction } from "@/app/relay/[token]/actions";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export default async function PublicRelayPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await params;
  const query = await searchParams;
  const message = await prisma.messageRelayMessage.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { attachments: true, ticket: true }
  });
  if (!message) notFound();

  const verified = query.verified === "1";
  const expired = isRelayExpired(message.expiresAt);

  async function verify(formData: FormData) {
    "use server";
    const result = await verifyRelayAccessAction(token, formData);
    if (result.ok) {
      redirect(`/relay/${token}?verified=1`);
    }
    redirect(`/relay/${token}?error=${result.reason}`);
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/6 p-6">
        <p className="text-sm text-[#8B95A7]">平台客服传话</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#E8EEF8]">{message.ticket.businessType} 服务消息</h1>
        <p className="mt-2 text-sm text-[#8B95A7]">有效期至 {message.expiresAt.toLocaleString("zh-CN")}</p>

        {expired ? (
          <p className="mt-6 rounded-xl border border-[#FFB86B]/30 bg-[#FFB86B]/10 px-4 py-3 text-sm text-[#FFB86B]">链接已过期。</p>
        ) : verified ? (
          <div className="mt-6">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[#E8EEF8]">{message.renderedContent}</p>
            <div className="mt-6 grid gap-4">
              {message.attachments.map((attachment) => (
                attachment.fileUrl ? <img key={attachment.id} src={attachment.fileUrl} alt={attachment.fileName} className="max-h-[520px] rounded-xl object-contain" /> : null
              ))}
            </div>
          </div>
        ) : (
          <form action={verify} className="mt-6 grid gap-4">
            {query.error ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">校验失败，请确认手机号后四位。</p> : null}
            <label className="grid gap-2 text-sm text-[#E8EEF8]">
              手机号后四位
              <input name="lastFour" required pattern="\d{4}" maxLength={4} className="rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none" />
            </label>
            <button className="rounded-full bg-[#48F5D3] px-5 py-3 text-sm font-semibold text-[#05110e]">查看消息</button>
          </form>
        )}
      </div>
    </Container>
  );
}
```

- [ ] **Step 3: Create provider webhook route**

Create `src/app/api/message-relay/provider-webhook/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json() as {
    providerMessageId?: string;
    status?: "delivered" | "failed" | "unknown";
    reason?: string;
  };

  if (!body.providerMessageId) {
    return NextResponse.json({ ok: false, error: "providerMessageId is required" }, { status: 400 });
  }

  const status = body.status === "delivered" ? "delivered" : body.status === "failed" ? "failed" : "sent";
  await prisma.messageRelayDelivery.updateMany({
    where: { providerMessageId: body.providerMessageId },
    data: { status, failureReason: body.reason ?? null, raw: body }
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

Run:

```bash
git add src/app/relay src/app/api/message-relay
git commit -m "feat: add public relay access"
```

---

### Task 7: End-To-End Coverage And Final Verification

**Files:**
- Create: `tests/e2e/message-relay.spec.ts`
- Verify all touched files.

- [ ] **Step 1: Create Playwright smoke test**

Create `tests/e2e/message-relay.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("admin can open message relay pages", async ({ page }) => {
  await page.goto("/admin/message-relay");
  await expect(page.getByRole("heading", { name: "传话工单" })).toBeVisible();

  await page.goto("/admin/message-relay/templates");
  await expect(page.getByRole("heading", { name: "传话模板" })).toBeVisible();

  await page.goto("/admin/message-relay/reviews");
  await expect(page.getByRole("heading", { name: "传话复核" })).toBeVisible();
});
```

- [ ] **Step 2: Run focused unit tests**

Run:

```bash
npm test -- src/lib/message-relay-rules.test.ts src/lib/message-relay-provider.test.ts src/lib/message-relay-storage.test.ts src/app/admin/message-relay/actions.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run Prisma validation and generation**

Run:

```bash
npx prisma validate
npx prisma generate
```

Expected: both commands finish without errors.

- [ ] **Step 4: Run global checks**

Run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 5: Run e2e smoke when a dev server is available**

Start the app if it is not already running:

```bash
npm run dev
```

In a second terminal, run:

```bash
npm run test:e2e -- tests/e2e/message-relay.spec.ts
```

Expected: PASS. If auth redirects block the test, seed or log in using the existing project admin test pattern before asserting page headings.

- [ ] **Step 6: Review changed files**

Run:

```bash
git status --short
git diff --stat
git diff -- prisma/schema.prisma src/lib/message-relay-rules.ts src/app/admin/message-relay/actions.ts
```

Expected: only message-relay files, schema migration, admin nav, public relay page, webhook, and tests are changed.

- [ ] **Step 7: Commit final verification assets**

Run:

```bash
git add tests/e2e/message-relay.spec.ts
git commit -m "test: cover message relay smoke flow"
```

## Spec Coverage Self-Review

- PRD goal: covered by Tasks 4, 5, and 6.
- Business authorization and ticket validity: covered by Tasks 2 and 4.
- Template-only sending with controlled supplement: covered by Tasks 1, 4, and 5.
- Image link relay: covered by Tasks 3, 4, 5, and 6.
- Mock provider adapter: covered by Tasks 3, 4, and 6.
- Medium risk controls: covered by Task 1 rules and Task 4 review creation for sensitive content.
- Admin pages: covered by Task 5.
- Public token page and last-four verification: covered by Task 6.
- Audit logging: covered by Task 4 server actions.
- Tests and verification: covered by Tasks 1, 3, 4, and 7.
