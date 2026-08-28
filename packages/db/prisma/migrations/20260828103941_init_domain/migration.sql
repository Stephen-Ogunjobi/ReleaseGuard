-- CreateEnum
CREATE TYPE "RunnerType" AS ENUM ('PLAYWRIGHT_BROWSER');

-- CreateEnum
CREATE TYPE "VerificationTriggerType" AS ENUM ('MANUAL', 'MANUAL_RERUN', 'DEPLOYMENT');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'INFRASTRUCTURE_ERROR', 'TIMED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('PROVISIONING', 'RUNNING', 'PASSED', 'FAILED', 'INFRASTRUCTURE_ERROR', 'TIMED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FailureType" AS ENUM ('ASSERTION', 'APPLICATION_NETWORK', 'TARGET_UNAVAILABLE', 'BROWSER', 'RUNNER', 'SECRET_RESOLUTION', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckDefinition" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "runnerType" "RunnerType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckVersion" (
    "id" TEXT NOT NULL,
    "checkDefinitionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "runnerType" "RunnerType" NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "configurationJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "triggerType" "VerificationTriggerType" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL,
    "verificationRunId" TEXT NOT NULL,
    "checkVersionId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL,
    "checkRunId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'PROVISIONING',
    "failureType" "FailureType",
    "failureMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Environment_projectId_idx" ON "Environment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_projectId_name_key" ON "Environment"("projectId", "name");

-- CreateIndex
CREATE INDEX "CheckDefinition_projectId_idx" ON "CheckDefinition"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckDefinition_projectId_name_key" ON "CheckDefinition"("projectId", "name");

-- CreateIndex
CREATE INDEX "CheckVersion_checkDefinitionId_idx" ON "CheckVersion"("checkDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckVersion_checkDefinitionId_versionNumber_key" ON "CheckVersion"("checkDefinitionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRun_correlationId_key" ON "VerificationRun"("correlationId");

-- CreateIndex
CREATE INDEX "VerificationRun_projectId_idx" ON "VerificationRun"("projectId");

-- CreateIndex
CREATE INDEX "VerificationRun_environmentId_idx" ON "VerificationRun"("environmentId");

-- CreateIndex
CREATE INDEX "VerificationRun_status_idx" ON "VerificationRun"("status");

-- CreateIndex
CREATE INDEX "CheckRun_verificationRunId_idx" ON "CheckRun"("verificationRunId");

-- CreateIndex
CREATE INDEX "CheckRun_checkVersionId_idx" ON "CheckRun"("checkVersionId");

-- CreateIndex
CREATE INDEX "CheckRun_status_idx" ON "CheckRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CheckRun_verificationRunId_checkVersionId_key" ON "CheckRun"("verificationRunId", "checkVersionId");

-- CreateIndex
CREATE INDEX "Attempt_checkRunId_idx" ON "Attempt"("checkRunId");

-- CreateIndex
CREATE INDEX "Attempt_status_idx" ON "Attempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_checkRunId_attemptNumber_key" ON "Attempt"("checkRunId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckDefinition" ADD CONSTRAINT "CheckDefinition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckVersion" ADD CONSTRAINT "CheckVersion_checkDefinitionId_fkey" FOREIGN KEY ("checkDefinitionId") REFERENCES "CheckDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRun" ADD CONSTRAINT "VerificationRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_verificationRunId_fkey" FOREIGN KEY ("verificationRunId") REFERENCES "VerificationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_checkVersionId_fkey" FOREIGN KEY ("checkVersionId") REFERENCES "CheckVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_checkRunId_fkey" FOREIGN KEY ("checkRunId") REFERENCES "CheckRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
