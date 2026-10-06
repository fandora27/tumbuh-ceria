-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" UUID NOT NULL,
    "parent_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "birth" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Belum dipantau',
    "initials" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'mint',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pretest_questions" (
    "id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Pre-Test',
    "question_type" TEXT NOT NULL,
    "options_json" TEXT NOT NULL DEFAULT '[]',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pretest_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pretest_submissions" (
    "id" UUID NOT NULL,
    "form_name" TEXT NOT NULL DEFAULT 'Pre-Test',
    "child_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers_json" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pretest_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pretest_answers" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pretest_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_contents" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "time_label" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'mint',
    "description" TEXT NOT NULL DEFAULT '',
    "media_type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "file_url" TEXT,
    "author_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_views" (
    "user_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_views_pkey" PRIMARY KEY ("user_id","content_id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "children_parent_id_idx" ON "children"("parent_id");

-- CreateIndex
CREATE INDEX "pretest_questions_category_active_idx" ON "pretest_questions"("category", "active");

-- CreateIndex
CREATE INDEX "pretest_questions_sort_order_idx" ON "pretest_questions"("sort_order");

-- CreateIndex
CREATE INDEX "pretest_submissions_account_id_idx" ON "pretest_submissions"("account_id");

-- CreateIndex
CREATE INDEX "pretest_submissions_form_name_idx" ON "pretest_submissions"("form_name");

-- CreateIndex
CREATE UNIQUE INDEX "pretest_submissions_child_id_form_name_key" ON "pretest_submissions"("child_id", "form_name");

-- CreateIndex
CREATE INDEX "pretest_answers_question_id_idx" ON "pretest_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "pretest_answers_submission_id_question_id_key" ON "pretest_answers"("submission_id", "question_id");

-- CreateIndex
CREATE INDEX "education_contents_status_idx" ON "education_contents"("status");

-- CreateIndex
CREATE INDEX "education_contents_category_idx" ON "education_contents"("category");

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pretest_questions" ADD CONSTRAINT "pretest_questions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pretest_submissions" ADD CONSTRAINT "pretest_submissions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pretest_submissions" ADD CONSTRAINT "pretest_submissions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pretest_answers" ADD CONSTRAINT "pretest_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "pretest_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_contents" ADD CONSTRAINT "education_contents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "education_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

