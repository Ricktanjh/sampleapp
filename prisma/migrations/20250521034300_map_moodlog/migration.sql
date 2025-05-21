-- CreateTable
CREATE TABLE "moodlog" (
    "id" SERIAL NOT NULL,
    "mood" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moodlog_pkey" PRIMARY KEY ("id")
);
