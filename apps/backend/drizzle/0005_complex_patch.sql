CREATE TABLE "addons" (
	"id" uuid PRIMARY KEY NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "table_id" uuid;--> statement-breakpoint
ALTER TABLE "addons" ADD CONSTRAINT "addons_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "addons_restaurant_id_name_idx" ON "addons" USING btree ("restaurant_id","name");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;