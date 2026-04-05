-- Fix read-only issues for admin operations
-- This migration adds missing RLS policies that prevent system admins from updating records

-- 1. Add system admin full-access policy to update_comments
-- Currently only has SELECT and INSERT; missing UPDATE and DELETE
CREATE POLICY "System admins can manage all update_comments" ON public.update_comments
  FOR ALL TO authenticated USING (public.is_system_admin());

-- 2. Add explicit UPDATE policy for system admins on project_updates (may be needed even with FOR ALL)
CREATE POLICY "System admins can update any project update" ON public.project_updates
  FOR UPDATE TO authenticated USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- 3. Add explicit UPDATE/DELETE policies for system admins on prospect_notes if needed
CREATE POLICY "System admins can update any prospect note" ON public.prospect_notes
  FOR UPDATE TO authenticated USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY "System admins can delete any prospect note" ON public.prospect_notes
  FOR DELETE TO authenticated USING (public.is_system_admin());

-- 4. Add explicit UPDATE/DELETE policies for system admins on prospect_links
CREATE POLICY "System admins can update any prospect link" ON public.prospect_links
  FOR UPDATE TO authenticated USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

CREATE POLICY "System admins can delete any prospect link" ON public.prospect_links
  FOR DELETE TO authenticated USING (public.is_system_admin());

-- 5. Add explicit DELETE policy for system admins on project_updates
CREATE POLICY "System admins can delete any project update" ON public.project_updates
  FOR DELETE TO authenticated USING (public.is_system_admin());

-- 6. Add explicit DELETE policy for system admins on update_comments (if needed beyond FOR ALL)
CREATE POLICY "System admins can delete any update_comment" ON public.update_comments
  FOR DELETE TO authenticated USING (public.is_system_admin());
