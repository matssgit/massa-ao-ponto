CREATE TABLE "restaurant_operating_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"opens_at" time(0),
	"closes_at" time(0),
	"active" boolean NOT NULL,
	CONSTRAINT "restaurant_operating_hours_day_range_check" CHECK ("restaurant_operating_hours"."day_of_week" between 0 and 6),
	CONSTRAINT "restaurant_operating_hours_interval_check" CHECK (("restaurant_operating_hours"."active" and "restaurant_operating_hours"."opens_at" is not null and "restaurant_operating_hours"."closes_at" is not null and "restaurant_operating_hours"."opens_at" < "restaurant_operating_hours"."closes_at") or (not "restaurant_operating_hours"."active" and "restaurant_operating_hours"."opens_at" is null and "restaurant_operating_hours"."closes_at" is null))
);
--> statement-breakpoint
ALTER TABLE "restaurant_operating_hours" ADD CONSTRAINT "restaurant_operating_hours_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_operating_hours_restaurant_day_unique" ON "restaurant_operating_hours" USING btree ("restaurant_id","day_of_week");