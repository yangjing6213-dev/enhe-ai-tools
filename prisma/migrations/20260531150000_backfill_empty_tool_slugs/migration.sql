UPDATE "tools"
SET "slug" = CONCAT('tool-', "id")
WHERE LENGTH(TRIM("slug")) = 0;
