-- CreateTable
CREATE TABLE "Digest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "creatoIl" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodoCoperto" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digestId" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "titolo" TEXT NOT NULL,
    "estratto" TEXT NOT NULL,
    "dataPubblicazione" DATETIME NOT NULL,
    CONSTRAINT "NewsItem_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digestId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "conteggioMenzioni" INTEGER NOT NULL,
    "sentimentMedio" REAL NOT NULL,
    "variazioneRispettoAlDigestPrecedente" REAL,
    CONSTRAINT "Signal_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Explanation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signalId" TEXT NOT NULL,
    "testo" TEXT NOT NULL,
    "modelloUsato" TEXT NOT NULL,
    CONSTRAINT "Explanation_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "digestId" TEXT NOT NULL,
    "signalId" TEXT,
    "ticker" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "prezzoChiusura" REAL NOT NULL,
    "data" DATETIME NOT NULL,
    CONSTRAINT "PriceSnapshot_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PriceSnapshot_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "NewsItem_digestId_idx" ON "NewsItem"("digestId");

-- CreateIndex
CREATE INDEX "Signal_digestId_idx" ON "Signal"("digestId");

-- CreateIndex
CREATE UNIQUE INDEX "Explanation_signalId_key" ON "Explanation"("signalId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_digestId_idx" ON "PriceSnapshot"("digestId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_signalId_idx" ON "PriceSnapshot"("signalId");
