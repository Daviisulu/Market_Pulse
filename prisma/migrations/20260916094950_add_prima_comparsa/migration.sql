/*
  Warnings:

  - Added the required column `primaComparsa` to the `Signal` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digestId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "conteggioMenzioni" INTEGER NOT NULL,
    "quotaAttenzione" REAL NOT NULL,
    "sentimentMedio" REAL NOT NULL,
    "variazioneRispettoAlDigestPrecedente" REAL,
    "primaComparsa" BOOLEAN NOT NULL,
    CONSTRAINT "Signal_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Signal" ("conteggioMenzioni", "digestId", "id", "nome", "quotaAttenzione", "sentimentMedio", "tipo", "variazioneRispettoAlDigestPrecedente") SELECT "conteggioMenzioni", "digestId", "id", "nome", "quotaAttenzione", "sentimentMedio", "tipo", "variazioneRispettoAlDigestPrecedente" FROM "Signal";
DROP TABLE "Signal";
ALTER TABLE "new_Signal" RENAME TO "Signal";
CREATE INDEX "Signal_digestId_idx" ON "Signal"("digestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
