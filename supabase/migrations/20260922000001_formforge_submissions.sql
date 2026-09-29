-- ============================================================================
-- FormForge AI: Submissions & Row Level Security Migration
-- Migration: 20260922000001_formforge_submissions.sql
-- Description: Creates workspace, forms, and form_submissions tables with strict RLS
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. WORKSPACE MEMBERS TABLE (For multi-tenant RBAC)
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id) in Supabase Auth
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

-- 4. FORMS TABLE
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(workspace_id, slug)
);

-- 5. FORM VERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.form_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    schema_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(form_id, version_number)
);

-- 6. FORM SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    published_version_id UUID REFERENCES public.form_versions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'processing', 'completed', 'flagged')),
    data JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PERFORMANCE & IDEMPOTENCY INDEXES
CREATE INDEX IF NOT EXISTS idx_form_submissions_workspace_created 
    ON public.form_submissions (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_created 
    ON public.form_submissions (form_id, created_at DESC);

-- Unique index to guarantee at-most-once idempotency per form
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_submissions_idempotency 
    ON public.form_submissions (form_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Submissions Policy 1: Allow public/anonymous and authenticated users to submit (INSERT)
CREATE POLICY "allow_public_form_submissions"
    ON public.form_submissions
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        -- Enforce that the target form exists and is published
        EXISTS (
            SELECT 1 FROM public.forms f
            WHERE f.id = form_submissions.form_id
            AND f.is_published = true
        )
    );

-- Submissions Policy 2: Allow workspace members to view (SELECT) only their workspace submissions
CREATE POLICY "allow_workspace_members_select_submissions"
    ON public.form_submissions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = form_submissions.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Submissions Policy 3: Allow workspace admins and owners to manage (UPDATE/DELETE) submissions
CREATE POLICY "allow_workspace_admins_modify_submissions"
    ON public.form_submissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = form_submissions.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = form_submissions.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
    );

-- NOTE: Anonymous users have NO SELECT policy on form_submissions, strictly blocking any public reads.

-- 9. DEFAULT SEED DATA (For local development and testing)
INSERT INTO public.workspaces (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'FormForge Demo Workspace', 'formforge-demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.forms (id, workspace_id, title, slug, is_published)
VALUES ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Basic User Profile Form', 'basic-user-profile', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.form_versions (id, form_id, version_number, schema_definition, is_active)
VALUES ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 1, '{"fields": ["name", "age", "dateOfBirth", "address"]}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
