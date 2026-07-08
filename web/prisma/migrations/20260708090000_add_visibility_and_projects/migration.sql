CREATE TYPE "NoteVisibility" AS ENUM ('public', 'private', 'unlisted');

ALTER TABLE "Note"
ADD COLUMN "visibility" "NoteVisibility" NOT NULL DEFAULT 'public';

CREATE INDEX "Note_status_visibility_idx" ON "Note" ("status", "visibility");

CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "year" TEXT,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "stack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cover" TEXT,
    "github" TEXT,
    "demo" TEXT,
    "docsUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_visible_featured_sortOrder_idx" ON "Project"("visible", "featured", "sortOrder");
