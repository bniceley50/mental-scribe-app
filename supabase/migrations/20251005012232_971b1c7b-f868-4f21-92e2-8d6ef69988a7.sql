-- Fix security issue: set search_path on derive_classification function
CREATE OR REPLACE FUNCTION public.derive_classification(_program_id uuid)
RETURNS data_classification
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN p.is_part2 THEN 'part2_protected'::public.data_classification
    ELSE 'standard_phi'::public.data_classification
  END
  FROM public.programs p
  WHERE p.id = _program_id;
$$;