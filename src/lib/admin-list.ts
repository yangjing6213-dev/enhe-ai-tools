import type { Prisma } from "@prisma/client";

const defaultPageSize = 20;
const userRoles = ["user", "admin"] as const;
const userStatuses = ["active", "disabled"] as const;
const toolStatuses = ["draft", "published", "offline"] as const;
const commentStatuses = ["pending", "approved", "rejected", "deleted"] as const;
const fileStorageTypes = ["local", "cos"] as const;
const refundStatuses = ["pending", "completed", "rejected"] as const;

type Pagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type AdminUserListParams = Pagination & {
  q: string;
  role?: (typeof userRoles)[number];
  status?: (typeof userStatuses)[number];
};

export type AdminToolListParams = Pagination & {
  q: string;
  status?: (typeof toolStatuses)[number];
  categoryId?: string;
};

export type AdminCommentListParams = Pagination & {
  q: string;
  status?: (typeof commentStatuses)[number];
  pinned?: boolean;
};

export type AdminFileListParams = Pagination & {
  q: string;
  storage?: (typeof fileStorageTypes)[number];
  toolId?: string;
};

export type AdminRefundListParams = Pagination & {
  q: string;
  status?: (typeof refundStatuses)[number];
};

function parsePagination(params: Record<string, string | undefined>): Pagination {
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  return {
    page,
    pageSize: defaultPageSize,
    skip: (page - 1) * defaultPageSize,
    take: defaultPageSize
  };
}

function parseEnumValue<T extends readonly string[]>(value: string | undefined, allowed: T): T[number] | undefined {
  return allowed.includes(value as T[number]) ? (value as T[number]) : undefined;
}

function buildPageHref(path: string, filters: Record<string, string | boolean | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  params.set("page", String(Math.max(1, page)));
  return `${path}?${params.toString()}`;
}

export function parseAdminUserListParams(params: Record<string, string | undefined>): AdminUserListParams {
  return {
    q: (params.q ?? "").trim(),
    role: parseEnumValue(params.role, userRoles),
    status: parseEnumValue(params.status, userStatuses),
    ...parsePagination(params)
  };
}

export function buildAdminUserWhere(filters: Pick<AdminUserListParams, "q" | "role" | "status">): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (filters.role) where.role = filters.role;
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { email: { contains: filters.q, mode: "insensitive" } },
      { phone: { contains: filters.q, mode: "insensitive" } },
      { nickname: { contains: filters.q, mode: "insensitive" } }
    ];
  }
  return where;
}

export function buildAdminUserPageHref(filters: Pick<AdminUserListParams, "q" | "role" | "status">, page: number) {
  return buildPageHref("/admin/users", filters, page);
}

export function parseAdminToolListParams(params: Record<string, string | undefined>): AdminToolListParams {
  return {
    q: (params.q ?? "").trim(),
    status: parseEnumValue(params.status, toolStatuses),
    categoryId: params.categoryId?.trim() || undefined,
    ...parsePagination(params)
  };
}

export function buildAdminToolWhere(
  type: "software" | "online" | "skill_learning",
  filters: Pick<AdminToolListParams, "q" | "status" | "categoryId">
): Prisma.ToolWhereInput {
  const where: Prisma.ToolWhereInput = { type };
  if (filters.status) where.status = filters.status;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { englishName: { contains: filters.q, mode: "insensitive" } },
      { slug: { contains: filters.q, mode: "insensitive" } },
      { shortDescription: { contains: filters.q, mode: "insensitive" } }
    ];
  }
  return where;
}

export function buildAdminToolPageHref(
  path: "/admin/software" | "/admin/online-tools" | string,
  filters: Pick<AdminToolListParams, "q" | "status" | "categoryId">,
  page: number
) {
  return buildPageHref(path, filters, page);
}

export function parseAdminCommentListParams(params: Record<string, string | undefined>): AdminCommentListParams {
  const pinned = params.pinned === "true" ? true : params.pinned === "false" ? false : undefined;
  return {
    q: (params.q ?? "").trim(),
    status: parseEnumValue(params.status, commentStatuses),
    pinned,
    ...parsePagination(params)
  };
}

export function buildAdminCommentWhere(filters: Pick<AdminCommentListParams, "q" | "status" | "pinned">): Prisma.CommentWhereInput {
  const where: Prisma.CommentWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.pinned !== undefined) where.isPinned = filters.pinned;
  if (filters.q) {
    where.OR = [
      { content: { contains: filters.q, mode: "insensitive" } },
      { user: { email: { contains: filters.q, mode: "insensitive" } } },
      { user: { phone: { contains: filters.q, mode: "insensitive" } } },
      { user: { nickname: { contains: filters.q, mode: "insensitive" } } },
      { tool: { is: { name: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }
  return where;
}

export function buildAdminCommentPageHref(filters: Pick<AdminCommentListParams, "q" | "status" | "pinned">, page: number) {
  return buildPageHref("/admin/comments", filters, page);
}

export function parseAdminFileListParams(params: Record<string, string | undefined>): AdminFileListParams {
  return {
    q: (params.q ?? "").trim(),
    storage: parseEnumValue(params.storage, fileStorageTypes),
    toolId: params.toolId?.trim() || undefined,
    ...parsePagination(params)
  };
}

export function buildAdminFileWhere(filters: Pick<AdminFileListParams, "q" | "storage" | "toolId">): Prisma.FileWhereInput {
  const where: Prisma.FileWhereInput = {};
  if (filters.toolId) where.toolId = filters.toolId;
  if (filters.storage === "cos") where.filePath = { startsWith: "cos://" };
  if (filters.storage === "local") where.filePath = { not: { startsWith: "cos://" } };
  if (filters.q) {
    where.OR = [
      { fileName: { contains: filters.q, mode: "insensitive" } },
      { filePath: { contains: filters.q, mode: "insensitive" } },
      { fileUrl: { contains: filters.q, mode: "insensitive" } },
      { tool: { is: { name: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }
  return where;
}

export function buildAdminFilePageHref(filters: Pick<AdminFileListParams, "q" | "storage" | "toolId">, page: number) {
  return buildPageHref("/admin/files", filters, page);
}

export function parseAdminRefundListParams(params: Record<string, string | undefined>): AdminRefundListParams {
  return {
    q: (params.q ?? "").trim(),
    status: parseEnumValue(params.status, refundStatuses),
    ...parsePagination(params)
  };
}

export function buildAdminRefundWhere(filters: Pick<AdminRefundListParams, "q" | "status">): Prisma.OrderRefundRecordWhereInput {
  const where: Prisma.OrderRefundRecordWhereInput = {};
  if (filters.status) where.status = filters.status;
  if (filters.q) {
    where.OR = [
      { reason: { contains: filters.q, mode: "insensitive" } },
      { note: { contains: filters.q, mode: "insensitive" } },
      { refundReceiverQr: { contains: filters.q, mode: "insensitive" } },
      { order: { is: { orderNo: { contains: filters.q, mode: "insensitive" } } } },
      { order: { is: { user: { is: { email: { contains: filters.q, mode: "insensitive" } } } } } },
      { order: { is: { user: { is: { phone: { contains: filters.q, mode: "insensitive" } } } } } },
      { requester: { is: { email: { contains: filters.q, mode: "insensitive" } } } },
      { requester: { is: { phone: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }
  return where;
}

export function buildAdminRefundPageHref(filters: Pick<AdminRefundListParams, "q" | "status">, page: number) {
  return buildPageHref("/admin/refunds", filters, page);
}
