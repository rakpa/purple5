-- Add expense categories for user: rakpa8@gmail.com
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
-- This will add all the expense categories listed below

-- First, get the user_id for rakpa8@gmail.com
DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get user_id from email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'rakpa8@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email rakpa8@gmail.com not found. Please make sure you are signed in with this email.';
    END IF;
    
    -- Insert all expense categories
    INSERT INTO categories (user_id, name, icon, type) VALUES
        (user_uuid, 'Food', 'UtensilsCrossed', 'expense'),
        (user_uuid, 'B', 'Circle', 'expense'),
        (user_uuid, 'Amex cc', 'CreditCard', 'expense'),
        (user_uuid, 'HDFC CC', 'CreditCard', 'expense'),
        (user_uuid, 'Other', 'Circle', 'expense'),
        (user_uuid, 'Anu Toys', 'Gift', 'expense'),
        (user_uuid, 'Papa', 'User', 'expense'),
        (user_uuid, 'Entertainment', 'Film', 'expense'),
        (user_uuid, 'Krakow', 'MapPin', 'expense'),
        (user_uuid, 'TAXI', 'Car', 'expense'),
        (user_uuid, 'Education & Learning', 'Book', 'expense'),
        (user_uuid, 'Subscriptions', 'CreditCard', 'expense'),
        (user_uuid, 'Priya Poland Transfer', 'ArrowRightLeft', 'expense'),
        (user_uuid, 'Bills', 'FileText', 'expense'),
        (user_uuid, 'Internet Recharge', 'Wifi', 'expense'),
        (user_uuid, 'Poland Rent', 'Home', 'expense'),
        (user_uuid, 'Water', 'Droplet', 'expense'),
        (user_uuid, 'Wroclaw', 'MapPin', 'expense'),
        (user_uuid, 'Transport', 'Car', 'expense'),
        (user_uuid, 'Groceries', 'ShoppingBag', 'expense'),
        (user_uuid, 'Zype', 'Circle', 'expense'),
        (user_uuid, 'Shopping', 'ShoppingBag', 'expense'),
        (user_uuid, 'Sports', 'Dumbbell', 'expense'),
        (user_uuid, 'Zabka', 'Store', 'expense'),
        (user_uuid, 'Poland', 'MapPin', 'expense'),
        (user_uuid, 'ICICI CC', 'CreditCard', 'expense'),
        (user_uuid, 'Priya India transfer', 'ArrowRightLeft', 'expense')
    ON CONFLICT (user_id, name, type) DO NOTHING;
    
    RAISE NOTICE 'Successfully added categories for user: rakpa8@gmail.com';
END $$;

