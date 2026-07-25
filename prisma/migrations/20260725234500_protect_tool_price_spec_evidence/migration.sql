BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE "tool_price_specs"
  ADD CONSTRAINT "tool_price_specs_tool_id_restrict_fkey"
    FOREIGN KEY ("tool_id") REFERENCES "tools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_tool_price_spec_id_restrict_fkey"
    FOREIGN KEY ("tool_price_spec_id") REFERENCES "tool_price_specs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

ALTER TABLE "tool_purchases"
  ADD CONSTRAINT "tool_purchases_tool_price_spec_id_restrict_fkey"
    FOREIGN KEY ("tool_price_spec_id") REFERENCES "tool_price_specs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;

COMMIT;
