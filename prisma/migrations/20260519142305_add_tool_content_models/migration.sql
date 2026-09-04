-- CreateTable
CREATE TABLE "tool_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_tag_links" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "tool_tag_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_faqs" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_changelogs" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "release_date" TIMESTAMP(3),
    "status" "ContentStatus" NOT NULL DEFAULT 'active',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_changelogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_tags_name_key" ON "tool_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tool_tags_slug_key" ON "tool_tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tool_tag_links_tool_id_tag_id_key" ON "tool_tag_links"("tool_id", "tag_id");

-- CreateIndex
CREATE INDEX "tool_faqs_tool_id_status_idx" ON "tool_faqs"("tool_id", "status");

-- CreateIndex
CREATE INDEX "tool_changelogs_tool_id_status_idx" ON "tool_changelogs"("tool_id", "status");

-- AddForeignKey
ALTER TABLE "tool_tag_links" ADD CONSTRAINT "tool_tag_links_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_tag_links" ADD CONSTRAINT "tool_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tool_tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_faqs" ADD CONSTRAINT "tool_faqs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_changelogs" ADD CONSTRAINT "tool_changelogs_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
