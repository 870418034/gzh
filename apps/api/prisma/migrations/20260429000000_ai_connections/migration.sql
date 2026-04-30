-- CreateTable
CREATE TABLE "AiConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "baseUrl" TEXT,
    "authEncrypted" TEXT NOT NULL,
    "defaultModel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConnection_userId_idx" ON "AiConnection"("userId");

-- AddForeignKey
ALTER TABLE "AiConnection" ADD CONSTRAINT "AiConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

