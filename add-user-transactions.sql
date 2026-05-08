-- Add transactions for user: rakpa8@gmail.com
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
-- This will add all the transactions listed below

DO $$
DECLARE
    user_uuid UUID;
    category_name TEXT;
BEGIN
    -- Get user_id from email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'rakpa8@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email rakpa8@gmail.com not found. Please make sure you are signed in with this email.';
    END IF;
    
    -- Insert transactions
    -- Note: We need to map category_id to category name
    -- Since we don't have the category_id mapping, we'll use a lookup approach
    -- You may need to adjust category names based on your actual categories
    
    -- Helper function to get category name from category_id
    -- If category doesn't exist, we'll use a default or the category_id as fallback
    
    -- Insert all transactions
    INSERT INTO transactions (user_id, type, amount, date, description, category, created_at) VALUES
        (user_uuid, 'expense', 250.00, '2025-05-24', 'Primark', 'Shopping', '2025-05-24 15:12:38.433331+00'),
        (user_uuid, 'expense', 25.00, '2025-09-18', 'Zabka', 'Zabka', '2025-09-19 07:18:09.594679+00'),
        (user_uuid, 'expense', 210.00, '2025-08-04', 'India', 'Poland', '2025-08-06 04:20:13.66532+00'),
        (user_uuid, 'expense', 270.00, '2025-09-02', 'Rakesh Shoes', 'Shopping', '2025-09-05 14:35:28.726344+00'),
        (user_uuid, 'income', 2700.00, '2025-11-15', 'WD', 'Other', '2025-11-15 07:21:12.118621+00'),
        (user_uuid, 'expense', 7350.00, '2025-07-02', 'Credit card payment ', 'HDFC CC', '2025-07-16 17:26:20.966515+00'),
        (user_uuid, 'expense', 20.00, '2025-05-09', 'Zabka', 'Zabka', '2025-05-09 17:54:52.066236+00'),
        (user_uuid, 'expense', 20.00, '2025-09-06', 'Zabka', 'Zabka', '2025-09-06 18:28:05.472091+00'),
        (user_uuid, 'income', 14600.00, '2025-07-01', 'June Salary', 'Salary', '2025-07-16 06:30:30.162305+00'),
        (user_uuid, 'expense', 22.00, '2025-05-11', 'Tennis', 'Sports', '2025-05-11 20:37:50.972038+00'),
        (user_uuid, 'expense', 113.00, '2025-08-03', 'Play', 'Entertainment', '2025-08-06 04:16:08.598211+00'),
        (user_uuid, 'expense', 730.00, '2025-11-07', 'Car Insurance ', 'Bills', '2025-11-07 03:28:34.849551+00'),
        (user_uuid, 'expense', 200.00, '2025-12-01', 'India Groceries', 'Groceries', '2025-11-29 05:03:20.385672+00'),
        (user_uuid, 'expense', 76.00, '2025-09-07', 'Haircut', 'Other', '2025-09-07 15:54:35.045379+00'),
        (user_uuid, 'income', 14600.00, '2025-09-01', 'Salary', 'Salary', '2025-09-04 16:38:11.7644+00'),
        (user_uuid, 'expense', 35.00, '2025-08-06', 'Lyca', 'Entertainment', '2025-08-06 04:24:49.750677+00'),
        (user_uuid, 'expense', 8.00, '2025-09-12', 'ZABKA', 'Zabka', '2025-09-12 18:35:20.475568+00'),
        (user_uuid, 'expense', 15.00, '2025-08-04', 'Bolt', 'TAXI', '2025-08-06 04:25:24.322289+00'),
        (user_uuid, 'expense', 8400.00, '2025-04-02', 'March and April Rent', 'Poland Rent', '2025-05-12 20:39:40.757963+00'),
        (user_uuid, 'expense', 845.00, '2025-10-02', 'Anex', 'Amex cc', '2025-10-02 07:07:14.923473+00'),
        (user_uuid, 'expense', 150.00, '2025-09-05', 'School bag', 'Shopping', '2025-09-05 14:36:36.616609+00'),
        (user_uuid, 'expense', 4200.00, '2025-10-16', 'Rent', 'Poland Rent', '2025-10-18 06:47:33.256676+00'),
        (user_uuid, 'expense', 820.00, '2025-09-02', 'AMEC', 'Amex cc', '2025-09-04 16:40:27.999066+00'),
        (user_uuid, 'expense', 4200.00, '2025-11-10', 'Rent', 'Poland Rent', '2025-11-15 07:22:33.004026+00'),
        (user_uuid, 'expense', 11.00, '2025-05-08', 'Zabka', 'Zabka', '2025-05-08 19:54:52.646996+00'),
        (user_uuid, 'expense', 1000.00, '2025-06-17', 'Zabka', 'Zabka', '2025-07-15 07:49:41.987845+00'),
        (user_uuid, 'expense', 860.00, '2025-11-01', 'Amax', 'Amex cc', '2025-11-01 04:00:26.312758+00'),
        (user_uuid, 'expense', 10.00, '2025-05-08', 'Milk', 'Groceries', '2025-05-08 22:36:13.9557+00'),
        (user_uuid, 'expense', 375.00, '2025-11-15', 'Office trip', 'Transport', '2025-11-15 07:14:51.725724+00'),
        (user_uuid, 'expense', 180.00, '2025-05-06', 'Play WIFI', 'Internet Recharge', '2025-05-06 08:47:53.69005+00'),
        (user_uuid, 'income', 800.00, '2025-07-13', 'ZUS', 'Other', '2025-07-16 09:18:27.191508+00'),
        (user_uuid, 'expense', 180.00, '2025-11-15', 'ZARA T Shirt ', 'Shopping', '2025-11-15 07:20:47.639165+00'),
        (user_uuid, 'expense', 375.00, '2025-09-05', 'Zype', 'Zype', '2025-09-05 04:22:08.577464+00'),
        (user_uuid, 'expense', 25.00, '2025-05-13', 'Kofland', 'Groceries', '2025-05-13 18:44:12.673034+00'),
        (user_uuid, 'expense', 1000.00, '2025-08-01', 'TRC application ', 'Bills', '2025-08-06 04:26:28.798221+00'),
        (user_uuid, 'expense', 4200.00, '2025-08-06', 'Rent', 'Poland Rent', '2025-08-06 04:20:50.926839+00'),
        (user_uuid, 'expense', 500.00, '2025-04-02', 'Zabka', 'Groceries', '2025-05-12 20:40:14.40592+00'),
        (user_uuid, 'expense', 18.00, '2025-09-05', 'Groceries ', 'Zabka', '2025-09-04 22:06:40.797876+00'),
        (user_uuid, 'expense', 16.00, '2025-05-11', 'Bolt', 'TAXI', '2025-05-11 20:27:34.987154+00'),
        (user_uuid, 'expense', 35.00, '2025-08-01', 'Bolt', 'TAXI', '2025-08-06 04:27:16.119249+00'),
        (user_uuid, 'expense', 630.00, '2025-09-10', 'Krakow', 'Krakow', '2025-09-11 10:43:44.092554+00'),
        (user_uuid, 'expense', 4200.00, '2025-05-04', 'May Rent', 'Poland Rent', '2025-05-04 07:29:00.164402+00'),
        (user_uuid, 'expense', 85.00, '2025-09-13', 'H&M', 'Shopping', '2025-09-13 21:34:13.130416+00'),
        (user_uuid, 'expense', 66.00, '2025-05-11', 'India Iceland', 'Food', '2025-05-12 02:48:42.593496+00'),
        (user_uuid, 'income', 15300.00, '2025-05-01', 'March Salary', 'Salary', '2025-05-04 12:09:25.85232+00'),
        (user_uuid, 'expense', 2700.00, '2025-12-01', 'HDFC', 'HDFC CC', '2025-11-29 04:59:43.810713+00'),
        (user_uuid, 'expense', 35.00, '2025-08-05', 'Cafe', 'Food', '2025-08-06 04:21:12.38264+00'),
        (user_uuid, 'expense', 10.00, '2025-05-13', 'Zabka', 'Zabka', '2025-05-13 21:27:22.786756+00'),
        (user_uuid, 'expense', 80.00, '2025-08-02', 'Reserved shopping Priya', 'Shopping', '2025-08-06 04:11:24.281741+00'),
        (user_uuid, 'expense', 200.00, '2025-08-02', 'Parlor ', 'Other', '2025-08-06 04:22:44.594956+00'),
        (user_uuid, 'expense', 70.00, '2025-05-23', 'SMYK', 'Shopping', '2025-05-24 15:18:19.166637+00'),
        (user_uuid, 'expense', 30.00, '2025-05-11', 'Zabka', 'Zabka', '2025-05-13 21:28:14.595121+00'),
        (user_uuid, 'expense', 140.00, '2025-08-05', 'Martes', 'Sports', '2025-08-06 04:21:55.438228+00'),
        (user_uuid, 'income', 14650.00, '2025-08-01', 'July Salary', 'Salary', '2025-07-25 12:55:31.880081+00'),
        (user_uuid, 'expense', 90.00, '2025-12-01', 'Google One', 'Subscriptions', '2025-11-30 06:30:35.845924+00'),
        (user_uuid, 'expense', 2000.00, '2025-11-03', 'Priyanka', 'Other', '2025-11-19 18:49:42.560967+00'),
        (user_uuid, 'expense', 15.00, '2025-09-05', 'Zabka', 'Zabka', '2025-09-05 10:10:18.92505+00'),
        (user_uuid, 'expense', 246.00, '2025-08-06', 'Nord vpn', 'Subscriptions', '2025-08-06 04:28:35.41474+00'),
        (user_uuid, 'expense', 200.00, '2025-11-29', 'Office', 'Transport', '2025-11-29 09:29:18.059677+00'),
        (user_uuid, 'expense', 18.00, '2025-08-02', 'Flying tiger', 'Shopping', '2025-08-06 04:12:42.598267+00'),
        (user_uuid, 'expense', 210.00, '2025-05-22', 'Krakow 4 days', 'Krakow', '2025-05-22 19:59:35.506613+00'),
        (user_uuid, 'expense', 95.00, '2025-12-01', 'Manning', 'Subscriptions', '2025-11-30 06:29:28.672875+00'),
        (user_uuid, 'income', 1600.00, '2025-07-15', 'June Watch duty ', 'Other', '2025-07-16 09:18:58.76606+00'),
        (user_uuid, 'expense', 60.00, '2025-08-05', 'Book EPI', 'Education & Learning', '2025-08-06 04:23:57.821216+00'),
        (user_uuid, 'expense', 15.00, '2025-05-14', 'Zabka', 'Zabka', '2025-05-14 15:41:28.157688+00'),
        (user_uuid, 'expense', 50.00, '2025-09-05', 'Taxi', 'TAXI', '2025-09-05 21:16:28.054182+00'),
        (user_uuid, 'income', 15300.00, '2025-04-01', 'March Salary', 'Salary', '2025-05-06 13:31:43.83292+00'),
        (user_uuid, 'expense', 20.00, '2025-09-14', 'Zabka', 'Zabka', '2025-09-15 04:42:02.94459+00'),
        (user_uuid, 'expense', 1500.00, '2025-07-02', 'Priyanka', 'Groceries', '2025-07-16 09:16:49.99976+00'),
        (user_uuid, 'expense', 3370.00, '2025-09-02', 'HDFC CC Payment', 'HDFC CC', '2025-09-04 16:39:44.910734+00'),
        (user_uuid, 'income', 15000.00, '2025-11-01', 'October Salary', 'Salary', '2025-10-31 18:35:48.850744+00'),
        (user_uuid, 'expense', 35.00, '2025-09-13', 'Carafour', 'Groceries', '2025-09-13 21:34:45.277301+00'),
        (user_uuid, 'expense', 4200.00, '2025-07-01', 'July Rent', 'Poland Rent', '2025-07-16 09:13:54.426365+00'),
        (user_uuid, 'expense', 2020.00, '2025-11-01', 'HDFC CC payment ', 'HDFC CC', '2025-10-31 18:38:30.506938+00'),
        (user_uuid, 'expense', 1000.00, '2025-08-01', 'Priya', 'Other', '2025-08-06 04:10:19.890073+00'),
        (user_uuid, 'income', 10800.00, '2025-10-01', 'September ', 'Salary', '2025-10-02 07:06:08.667095+00'),
        (user_uuid, 'expense', 350.00, '2025-08-05', 'Zype', 'Zype', '2025-08-06 04:29:57.017645+00'),
        (user_uuid, 'expense', 2000.00, '2025-11-19', 'HDFC', 'HDFC CC', '2025-11-19 18:48:41.605238+00'),
        (user_uuid, 'expense', 4.00, '2025-05-16', 'Spar', 'Zabka', '2025-05-16 19:13:06.570477+00'),
        (user_uuid, 'expense', 40.00, '2025-05-23', 'LEGO', 'Shopping', '2025-05-24 15:15:25.804836+00'),
        (user_uuid, 'income', 14800.00, '2025-12-01', 'Salary', 'Salary', '2025-11-29 04:57:29.340307+00'),
        (user_uuid, 'expense', 1500.00, '2025-07-07', 'Krakow Trip', 'Krakow', '2025-07-16 09:13:06.951922+00'),
        (user_uuid, 'expense', 350.00, '2025-10-09', 'Humidifier ', 'Shopping', '2025-10-10 03:44:27.097034+00'),
        (user_uuid, 'income', 2200.00, '2025-10-15', 'WD', 'Other', '2025-10-18 06:48:03.896535+00'),
        (user_uuid, 'expense', 100.00, '2025-08-04', 'Priyanka', 'Other', '2025-08-06 04:24:30.718168+00'),
        (user_uuid, 'expense', 4200.00, '2025-09-05', 'September Rent', 'Poland Rent', '2025-09-04 22:07:24.548859+00'),
        (user_uuid, 'expense', 140.00, '2025-09-06', 'Reserved Jeans', 'Shopping', '2025-09-06 18:27:43.877606+00'),
        (user_uuid, 'expense', 20.00, '2025-12-01', 'Tubebuddy', 'Subscriptions', '2025-11-30 06:29:54.697727+00'),
        (user_uuid, 'expense', 110.00, '2025-09-14', 'Chubi Boom', 'Subscriptions', '2025-09-15 04:41:43.264135+00'),
        (user_uuid, 'expense', 845.00, '2025-12-01', 'Amex', 'Amex cc', '2025-11-29 05:01:58.844235+00'),
        (user_uuid, 'expense', 20.00, '2025-09-06', 'Zabka', 'Zabka', '2025-09-06 07:43:38.36236+00'),
        (user_uuid, 'expense', 80.00, '2025-05-14', 'Temu', 'Shopping', '2025-05-14 11:57:17.518353+00'),
        (user_uuid, 'expense', 50.00, '2025-05-23', 'ANU Jacket', 'Shopping', '2025-05-24 15:20:20.746866+00'),
        (user_uuid, 'expense', 118.00, '2025-07-17', 'Food', 'Food', '2025-07-17 20:29:52.659421+00'),
        (user_uuid, 'expense', 888.00, '2025-08-04', 'Amex', 'Amex cc', '2025-08-06 04:17:32.000391+00'),
        (user_uuid, 'expense', 140.00, '2025-09-02', 'Anu Shoes', 'Shopping', '2025-09-05 14:36:10.216214+00'),
        (user_uuid, 'expense', 4256.00, '2025-08-03', 'Credit card payment ', 'HDFC CC', '2025-08-06 04:13:22.873844+00'),
        (user_uuid, 'expense', 4225.00, '2025-05-01', '100000', 'Other', '2025-05-11 12:01:56.377705+00'),
        (user_uuid, 'expense', 30.00, '2025-09-07', 'Zabka', 'Zabka', '2025-09-07 15:54:54.613121+00')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Successfully added transactions for user: rakpa8@gmail.com';
END $$;

