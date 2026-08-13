-- CreateTable
CREATE TABLE "AdminPermission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUserPermission" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminPermission_key_key" ON "AdminPermission"("key");

-- CreateIndex
CREATE INDEX "AdminUserPermission_adminId_idx" ON "AdminUserPermission"("adminId");

-- CreateIndex
CREATE INDEX "AdminUserPermission_permissionId_idx" ON "AdminUserPermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUserPermission_adminId_permissionId_key" ON "AdminUserPermission"("adminId", "permissionId");

-- AddForeignKey
ALTER TABLE "AdminUserPermission" ADD CONSTRAINT "AdminUserPermission_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUserPermission" ADD CONSTRAINT "AdminUserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "AdminPermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
