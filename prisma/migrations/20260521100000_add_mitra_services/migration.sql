-- CreateTable: mitra_services (one mitra → many services)
CREATE TABLE "mitra_services" (
    "id"          SERIAL NOT NULL,
    "userId"      INTEGER NOT NULL,
    "categoryId"  TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUnit"   TEXT NOT NULL DEFAULT 'jam',
    "isActive"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mitra_services_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mitra_services"
    ADD CONSTRAINT "mitra_services_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
