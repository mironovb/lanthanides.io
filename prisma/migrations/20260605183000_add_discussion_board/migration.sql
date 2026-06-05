-- CreateTable
CREATE TABLE "discussion_threads" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "organization" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',

    CONSTRAINT "discussion_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discussion_replies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'visible',

    CONSTRAINT "discussion_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discussion_threads_category_idx" ON "discussion_threads"("category");

-- CreateIndex
CREATE INDEX "discussion_threads_status_idx" ON "discussion_threads"("status");

-- CreateIndex
CREATE INDEX "discussion_threads_createdAt_idx" ON "discussion_threads"("createdAt");

-- CreateIndex
CREATE INDEX "discussion_replies_threadId_idx" ON "discussion_replies"("threadId");

-- CreateIndex
CREATE INDEX "discussion_replies_status_idx" ON "discussion_replies"("status");

-- CreateIndex
CREATE INDEX "discussion_replies_createdAt_idx" ON "discussion_replies"("createdAt");

-- AddForeignKey
ALTER TABLE "discussion_replies" ADD CONSTRAINT "discussion_replies_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
