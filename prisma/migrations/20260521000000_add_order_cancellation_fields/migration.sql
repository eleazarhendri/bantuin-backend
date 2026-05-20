-- AlterTable: tambah field pembatalan pesanan setelah accepted
ALTER TABLE "orders"
  ADD COLUMN "cancellationStatus" TEXT,
  ADD COLUMN "cancellationReason" TEXT,
  ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3);
