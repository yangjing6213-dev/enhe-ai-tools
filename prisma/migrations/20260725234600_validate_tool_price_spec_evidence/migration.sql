BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10min';

ALTER TABLE "tool_price_specs"
  VALIDATE CONSTRAINT "tool_price_specs_tool_id_restrict_fkey";
ALTER TABLE "orders"
  VALIDATE CONSTRAINT "orders_tool_price_spec_id_restrict_fkey";
ALTER TABLE "tool_purchases"
  VALIDATE CONSTRAINT "tool_purchases_tool_price_spec_id_restrict_fkey";

COMMIT;
