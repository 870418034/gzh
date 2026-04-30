-- CreateTable
CREATE TABLE "RouterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "routingRulesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RouterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RouterProfile_userId_idx" ON "RouterProfile"("userId");

-- AddForeignKey
ALTER TABLE "RouterProfile" ADD CONSTRAINT "RouterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

