-- Allow anyone (including anonymous) to submit a report
DROP POLICY IF EXISTS "Anyone authenticated can submit a report" ON public.reports;
CREATE POLICY "Anyone can submit a report"
ON public.reports
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

GRANT INSERT ON public.reports TO anon;