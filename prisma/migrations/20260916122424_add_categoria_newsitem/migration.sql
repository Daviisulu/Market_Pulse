/*
  Warnings:

  - Added the required column `categoria` to the `NewsItem` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digestId" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "estratto" TEXT NOT NULL,
    "dataPubblicazione" DATETIME NOT NULL,
    "categoria" TEXT NOT NULL,
    CONSTRAINT "NewsItem_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NewsItem" ("dataPubblicazione", "digestId", "estratto", "fonte", "id", "titolo", "url") SELECT "dataPubblicazione", "digestId", "estratto", "fonte", "id", "titolo", "url" FROM "NewsItem";
DROP TABLE "NewsItem";
ALTER TABLE "new_NewsItem" RENAME TO "NewsItem";
CREATE INDEX "NewsItem_digestId_idx" ON "NewsItem"("digestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
