DO $$ 
DECLARE 
  e_type TEXT;
BEGIN 
  SELECT typname INTO e_type FROM pg_type WHERE typname = 'enum_Messages_messageType'; 
  IF e_type IS NULL THEN 
    CREATE TYPE "enum_Messages_messageType" AS ENUM ('text', 'image', 'video', 'system'); 
  END IF; 
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'enum_Messages_messageType' AND e.enumlabel = 'voice'
  ) THEN
    ALTER TYPE "enum_Messages_messageType" ADD VALUE 'voice';
  END IF;
END$$;

UPDATE "Messages" SET "messageType" = 'text' WHERE "messageType" IS NULL;
ALTER TABLE "Messages" ALTER COLUMN "messageType" SET DEFAULT 'text';
ALTER TABLE "Messages" ALTER COLUMN "messageType" DROP DEFAULT;
ALTER TABLE "Messages" ALTER COLUMN "messageType" TYPE "enum_Messages_messageType" USING ("messageType"::text)::"enum_Messages_messageType";
ALTER TABLE "Messages" ALTER COLUMN "messageType" SET DEFAULT 'text';

-- Create Calls table if not exists
CREATE TABLE IF NOT EXISTS "Calls" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID REFERENCES "Conversations"("id"),
  "callerId" UUID NOT NULL REFERENCES "Users"("id"),
  "receiverId" UUID NOT NULL REFERENCES "Users"("id"),
  "callType" VARCHAR(10) NOT NULL CHECK ("callType" IN ('voice', 'video')),
  "status" VARCHAR(20) NOT NULL DEFAULT 'ringing' CHECK ("status" IN ('ringing', 'ongoing', 'completed', 'missed', 'rejected', 'cancelled')),
  "startedAt" TIMESTAMP,
  "endedAt" TIMESTAMP,
  "duration" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_calls_conversation" ON "Calls"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_calls_caller" ON "Calls"("callerId");
CREATE INDEX IF NOT EXISTS "idx_calls_receiver" ON "Calls"("receiverId");
CREATE INDEX IF NOT EXISTS "idx_calls_status" ON "Calls"("status");
CREATE INDEX IF NOT EXISTS "idx_calls_created" ON "Calls"("createdAt");
