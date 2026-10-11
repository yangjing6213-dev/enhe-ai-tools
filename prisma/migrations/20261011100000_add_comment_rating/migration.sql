ALTER TABLE "comments" ADD COLUMN "rating" INTEGER;

ALTER TABLE "comments"
ADD CONSTRAINT "comments_rating_range_check"
CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
