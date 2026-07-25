BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "tool_price_specs"
  DROP CONSTRAINT "tool_price_specs_tool_id_fkey";
ALTER TABLE "tool_price_specs"
  RENAME CONSTRAINT "tool_price_specs_tool_id_restrict_fkey"
  TO "tool_price_specs_tool_id_fkey";

ALTER TABLE "orders"
  DROP CONSTRAINT "orders_tool_price_spec_id_fkey";
ALTER TABLE "orders"
  RENAME CONSTRAINT "orders_tool_price_spec_id_restrict_fkey"
  TO "orders_tool_price_spec_id_fkey";

ALTER TABLE "tool_purchases"
  DROP CONSTRAINT "tool_purchases_tool_price_spec_id_fkey";
ALTER TABLE "tool_purchases"
  RENAME CONSTRAINT "tool_purchases_tool_price_spec_id_restrict_fkey"
  TO "tool_purchases_tool_price_spec_id_fkey";

COMMIT;
