-- Make email optional on users (drivers may not have email)
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Make phone unique on users (used as login identifier)
ALTER TABLE "users" ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");
