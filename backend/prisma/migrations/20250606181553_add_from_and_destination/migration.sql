/*
  Warnings:

  - You are about to drop the column `city` on the `Trip` table. All the data in the column will be lost.
  - Added the required column `destination` to the `Trip` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fromCity` to the `Trip` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Trip` DROP COLUMN `city`,
    ADD COLUMN `destination` VARCHAR(191) NOT NULL,
    ADD COLUMN `fromCity` VARCHAR(191) NOT NULL;
