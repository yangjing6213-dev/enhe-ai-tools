DO $$
DECLARE
  applied_migrations BIGINT;
  business_records BIGINT;
  duplicate_pending_refunds BIGINT;
BEGIN
  IF to_regclass('public._prisma_migrations') IS NULL THEN
    RAISE EXCEPTION 'Production database identity check failed: migration history is missing';
  END IF;

  SELECT COUNT(*)
  INTO applied_migrations
  FROM public._prisma_migrations
  WHERE finished_at IS NOT NULL
    AND rolled_back_at IS NULL;

  IF applied_migrations < 1 THEN
    RAISE EXCEPTION 'Production database identity check failed: no applied migrations';
  END IF;

  IF to_regclass('public.users') IS NULL OR to_regclass('public.tools') IS NULL THEN
    RAISE EXCEPTION 'Production database identity check failed: core business tables are missing';
  END IF;

  SELECT (SELECT COUNT(*) FROM public.users) + (SELECT COUNT(*) FROM public.tools)
  INTO business_records;

  IF business_records < 1 THEN
    RAISE EXCEPTION 'Production database identity check failed: core business records are empty';
  END IF;

  IF to_regclass('public.order_refund_records') IS NOT NULL THEN
    EXECUTE $query$
      SELECT COUNT(*)
      FROM (
        SELECT order_id
        FROM public.order_refund_records
        WHERE status::text = 'pending'
        GROUP BY order_id
        HAVING COUNT(*) > 1
      ) AS duplicates
    $query$
    INTO duplicate_pending_refunds;

    IF duplicate_pending_refunds > 0 THEN
      RAISE EXCEPTION 'Migration preflight failed: duplicate pending refunds exist';
    END IF;
  END IF;
END
$$;
