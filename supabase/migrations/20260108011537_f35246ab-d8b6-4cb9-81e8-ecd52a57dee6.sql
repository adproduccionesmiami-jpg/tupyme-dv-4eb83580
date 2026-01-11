-- Add expiration_date field to products table for expiration alerts
ALTER TABLE public.products 
ADD COLUMN expiration_date date DEFAULT NULL;