-- CreateTable
CREATE TABLE "IndustryPopularItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT,
    "industry" TEXT,
    "title" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "notes" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryPopularItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndustryPopularItem_userId_idx" ON "IndustryPopularItem"("userId");
CREATE INDEX "IndustryPopularItem_userId_platform_idx" ON "IndustryPopularItem"("userId", "platform");
CREATE INDEX "IndustryPopularItem_userId_industry_idx" ON "IndustryPopularItem"("userId", "industry");

-- AddForeignKey
ALTER TABLE "IndustryPopularItem"
ADD CONSTRAINT "IndustryPopularItem_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

