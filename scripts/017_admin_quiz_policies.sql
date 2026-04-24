-- Admin policies for quiz management
-- Allows admin users to manage quiz categories/questions and inspect attempts

DROP POLICY IF EXISTS quiz_categories_admin_insert ON public.quiz_categories;
CREATE POLICY quiz_categories_admin_insert ON public.quiz_categories
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS quiz_categories_admin_update ON public.quiz_categories;
CREATE POLICY quiz_categories_admin_update ON public.quiz_categories
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS quiz_categories_admin_delete ON public.quiz_categories;
CREATE POLICY quiz_categories_admin_delete ON public.quiz_categories
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS quiz_questions_admin_insert ON public.quiz_questions;
CREATE POLICY quiz_questions_admin_insert ON public.quiz_questions
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS quiz_questions_admin_update ON public.quiz_questions;
CREATE POLICY quiz_questions_admin_update ON public.quiz_questions
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS quiz_questions_admin_delete ON public.quiz_questions;
CREATE POLICY quiz_questions_admin_delete ON public.quiz_questions
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS quiz_attempts_admin_select ON public.quiz_attempts;
CREATE POLICY quiz_attempts_admin_select ON public.quiz_attempts
  FOR SELECT USING (public.is_admin());
