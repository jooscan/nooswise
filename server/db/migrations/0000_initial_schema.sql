CREATE TABLE "expense_splits" (
	"id" serial PRIMARY KEY NOT NULL,
	"expense_id" text NOT NULL,
	"member_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"original_amount_minor" bigint,
	"percentage" numeric(9, 4),
	"shares" numeric(9, 4),
	CONSTRAINT "expense_splits_amount_non_negative" CHECK ("expense_splits"."amount_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"title" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"original_amount_minor" bigint,
	"original_currency" text,
	"exchange_rate" numeric(18, 8),
	"paid_by_member_id" text NOT NULL,
	"category" text NOT NULL,
	"date" text NOT NULL,
	"split_type" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_amount_positive" CHECK ("expenses"."amount_minor" > 0),
	CONSTRAINT "expenses_category_valid" CHECK ("expenses"."category" IN ('food', 'travel', 'home', 'drinks', 'entertainment', 'other')),
	CONSTRAINT "expenses_split_type_valid" CHECK ("expenses"."split_type" IN ('equally', 'exact', 'percentage', 'shares'))
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'CAD' NOT NULL,
	"my_etransfer_email" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"revision" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_name_not_blank" CHECK (length(btrim("groups"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"payment_handle" text,
	"avatar_url" text,
	"avatar_bg" text,
	"avatar_emoji" text,
	"character_name" text,
	"initials" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_name_not_blank" CHECK (length(btrim("members"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"from_member_id" text NOT NULL,
	"to_member_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"date" text NOT NULL,
	"note" text,
	"payment_method" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_amount_positive" CHECK ("settlements"."amount_minor" > 0),
	CONSTRAINT "settlements_distinct_members" CHECK ("settlements"."from_member_id" <> "settlements"."to_member_id")
);
--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_member_id_members_id_fk" FOREIGN KEY ("paid_by_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_from_member_id_members_id_fk" FOREIGN KEY ("from_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_to_member_id_members_id_fk" FOREIGN KEY ("to_member_id") REFERENCES "public"."members"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expense_splits_expense_member_idx" ON "expense_splits" USING btree ("expense_id","member_id");--> statement-breakpoint
CREATE INDEX "expenses_group_id_created_at_idx" ON "expenses" USING btree ("group_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "groups_deleted_at_idx" ON "groups" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "members_group_id_idx" ON "members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "settlements_group_id_created_at_idx" ON "settlements" USING btree ("group_id","created_at" DESC NULLS LAST);