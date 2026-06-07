-- Add super_admin to app_role enum and seed the current super admin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
