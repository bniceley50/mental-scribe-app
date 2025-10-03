-- Fix security warnings: set search_path on trigger functions

CREATE OR REPLACE FUNCTION public.classify_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.classify_structured_note()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.classify_uploaded_file()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    NEW.data_classification := public.derive_classification(NEW.program_id);
  END IF;
  RETURN NEW;
END;
$$;