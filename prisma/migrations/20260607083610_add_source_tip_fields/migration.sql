-- AlterTable
ALTER TABLE "discussion_threads" ADD COLUMN     "elementSymbol" TEXT,
ADD COLUMN     "sourceDate" TEXT,
ADD COLUMN     "sourceUrl" TEXT;

-- CreateIndex
CREATE INDEX "discussion_threads_elementSymbol_idx" ON "discussion_threads"("elementSymbol");
