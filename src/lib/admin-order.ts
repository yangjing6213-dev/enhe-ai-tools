import type { OrderStatus, Prisma } from "@prisma/client";

const editableOrderStatuses = ["pending_payment", "pending_review", "paid", "rejected", "cancelled", "refunded"] as const;
const pageSize = 20;

export type AdminOrderListParams = {
  q: string;
  status?: (typeof editableOrderStatuses)[number];
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export function getOrderTimestampPatch(
  status: OrderStatus,
  paidAt: Date | null,
  activatedAt: Date | null
) {
  const now = new Date();

  if (status === "activated") {
    return {
      paidAt: paidAt ?? now,
      activatedAt: activatedAt ?? now
    };
  }

  if (status === "paid") {
    return {
      paidAt: paidAt ?? now
    };
  }

  return {};
}

export function parseAdminOrderListParams(params: Record<string, string | undefined>): AdminOrderListParams {
  const q = (params.q ?? "").trim();
  const status = editableOrderStatuses.includes(params.status as (typeof editableOrderStatuses)[number])
    ? (params.status as (typeof editableOrderStatuses)[number])
    : undefined;
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  return {
    q,
    status,
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

export function buildAdminOrderWhere(filters: Pick<AdminOrderListParams, "q" | "status">): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (filters.status) where.orderStatus = filters.status;
  if (filters.q) {
    where.OR = [
      { orderNo: { contains: filters.q, mode: "insensitive" } },
      { user: { email: { contains: filters.q, mode: "insensitive" } } },
      { user: { phone: { contains: filters.q, mode: "insensitive" } } },
      { plan: { is: { name: { contains: filters.q, mode: "insensitive" } } } },
      { tool: { is: { name: { contains: filters.q, mode: "insensitive" } } } }
    ];
  }
  return where;
}

export function buildAdminOrderPageHref(filters: Pick<AdminOrderListParams, "q" | "status">, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(Math.max(1, page)));
  return `/admin/orders?${params.toString()}`;
}
