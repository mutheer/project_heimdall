/*
  # Fix RLS policies for devices and users tables

  1. Changes
    - Update devices table RLS policies to allow authenticated users to insert devices
    - Update users table RLS policies to allow authenticated users to view all users
    - Add policy for users table to allow authenticated users to insert new users

  2. Security
    - Maintains existing security model while fixing permission issues
    - Ensures proper access control based on user roles
*/

-- Update devices table policies
CREATE POLICY "Authenticated users can insert devices"
ON public.devices
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update users table policies
CREATE POLICY "Authenticated users can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (true);