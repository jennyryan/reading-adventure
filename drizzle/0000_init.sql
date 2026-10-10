CREATE TABLE "auth_attempts" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "books_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text NOT NULL,
	"author" text,
	"isbn" text,
	"cover_url" text,
	"series_id" integer,
	"series_position" numeric,
	"open_library_work_id" text,
	"hardcover_book_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_open_library_work_id_unique" UNIQUE("open_library_work_id"),
	CONSTRAINT "books_hardcover_book_id_unique" UNIQUE("hardcover_book_id")
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "readings_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"book_id" integer NOT NULL,
	"rating" smallint NOT NULL,
	"read_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "readings_rating_range" CHECK ("readings"."rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "series" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "series_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"hardcover_series_id" integer,
	"members_fetched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_hardcover_series_id_unique" UNIQUE("hardcover_series_id")
);
--> statement-breakpoint
CREATE TABLE "series_members" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "series_members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"series_id" integer NOT NULL,
	"hardcover_book_id" integer NOT NULL,
	"title" text NOT NULL,
	"author" text,
	"cover_url" text,
	"position" numeric,
	CONSTRAINT "series_members_series_book" UNIQUE("series_id","hardcover_book_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"reading_goal" integer DEFAULT 20 NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_goal_positive" CHECK ("settings"."reading_goal" between 1 and 1000)
);
--> statement-breakpoint
CREATE TABLE "up_next_dismissals" (
	"hardcover_book_id" integer PRIMARY KEY NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_members" ADD CONSTRAINT "series_members_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "readings_book_id_idx" ON "readings" USING btree ("book_id");