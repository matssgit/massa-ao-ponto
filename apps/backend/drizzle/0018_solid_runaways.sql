CREATE TABLE "restaurant_special_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"date" date NOT NULL,
	"closed" boolean NOT NULL,
	"opens_at" time(0),
	"closes_at" time(0),
	"label" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_special_hours_interval_check" CHECK (("restaurant_special_hours"."closed" and "restaurant_special_hours"."opens_at" is null and "restaurant_special_hours"."closes_at" is null) or (not "restaurant_special_hours"."closed" and "restaurant_special_hours"."opens_at" is not null and "restaurant_special_hours"."closes_at" is not null and "restaurant_special_hours"."opens_at" < "restaurant_special_hours"."closes_at"))
);
--> statement-breakpoint
ALTER TABLE "restaurant_special_hours" ADD CONSTRAINT "restaurant_special_hours_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "restaurant_special_hours_restaurant_date_unique" ON "restaurant_special_hours" USING btree ("restaurant_id","date");