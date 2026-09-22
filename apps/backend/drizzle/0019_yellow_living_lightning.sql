CREATE TYPE "public"."order_payment_method" AS ENUM('CASH', 'PIX', 'CARD');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" "order_payment_method";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "change_for_cents" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_change_check" CHECK ("orders"."change_for_cents" is null or ("orders"."payment_method" = 'CASH' and "orders"."change_for_cents" >= "orders"."total"));