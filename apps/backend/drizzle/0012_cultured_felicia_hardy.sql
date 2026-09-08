ALTER TABLE "restaurants" ADD COLUMN "slug" varchar(100);--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "public_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "public_access_token_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "restaurants_slug_unique" ON "restaurants" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_public_access_token_hash_unique" ON "reservations" USING btree ("public_access_token_hash");--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_slug_canonical_check" CHECK ("restaurants"."slug" is null or "restaurants"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "restaurants" ADD CONSTRAINT "restaurants_public_requires_slug_check" CHECK (not "restaurants"."public_enabled" or "restaurants"."slug" is not null);