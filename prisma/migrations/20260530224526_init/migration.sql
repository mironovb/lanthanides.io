-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elementSymbol" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "purity" TEXT NOT NULL,
    "quantityKg" REAL NOT NULL,
    "askingPricePerKg" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sellerName" TEXT NOT NULL,
    "sellerContact" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gaugeLow" REAL,
    "gaugeMid" REAL,
    "gaugeHigh" REAL,
    "gaugeConfidence" TEXT
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "email" TEXT,
    "topics" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'waitlist',
    "confirmedAt" DATETIME
);

-- CreateTable
CREATE TABLE "screened_offers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elementSymbol" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "purity" TEXT,
    "quantityKg" REAL,
    "pricePerKg" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sellerName" TEXT NOT NULL,
    "sellerCountry" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "observedDate" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "valueScore" REAL NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'screened'
);

-- CreateIndex
CREATE INDEX "listings_elementSymbol_idx" ON "listings"("elementSymbol");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "subscriptions_channel_idx" ON "subscriptions"("channel");

-- CreateIndex
CREATE INDEX "screened_offers_elementSymbol_idx" ON "screened_offers"("elementSymbol");

-- CreateIndex
CREATE INDEX "screened_offers_origin_idx" ON "screened_offers"("origin");

-- CreateIndex
CREATE INDEX "screened_offers_valueScore_idx" ON "screened_offers"("valueScore");
