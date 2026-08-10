-- CreateTable
CREATE TABLE "RegistrationInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tenantId" TEXT,
    "createdBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationInvite_token_key" ON "RegistrationInvite"("token");

-- CreateIndex
CREATE INDEX "RegistrationInvite_token_idx" ON "RegistrationInvite"("token");

-- CreateIndex
CREATE INDEX "RegistrationInvite_tenantId_idx" ON "RegistrationInvite"("tenantId");

-- AddForeignKey
ALTER TABLE "RegistrationInvite" ADD CONSTRAINT "RegistrationInvite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationInvite" ADD CONSTRAINT "RegistrationInvite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationInvite" ADD CONSTRAINT "RegistrationInvite_usedByUserId_fkey" FOREIGN KEY ("usedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

