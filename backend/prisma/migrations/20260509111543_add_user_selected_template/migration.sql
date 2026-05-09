-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedTemplateId_fkey" FOREIGN KEY ("selectedTemplateId") REFERENCES "NotificationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
