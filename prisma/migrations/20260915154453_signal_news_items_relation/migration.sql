-- CreateTable
CREATE TABLE "_NewsItemToSignal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_NewsItemToSignal_A_fkey" FOREIGN KEY ("A") REFERENCES "NewsItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NewsItemToSignal_B_fkey" FOREIGN KEY ("B") REFERENCES "Signal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_NewsItemToSignal_AB_unique" ON "_NewsItemToSignal"("A", "B");

-- CreateIndex
CREATE INDEX "_NewsItemToSignal_B_index" ON "_NewsItemToSignal"("B");
