-- Add transactions for user: rakpa8@gmail.com
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
-- This script maps category_id to category names by looking up in the categories table

DO $$
DECLARE
    user_uuid UUID;
    cat_name TEXT;
    cat_id UUID;
BEGIN
    -- Get user_id from email
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = 'rakpa8@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User with email rakpa8@gmail.com not found. Please make sure you are signed in with this email.';
    END IF;
    
    -- Helper function to get category name from category_id
    -- First tries to look up in categories table, then uses fallback mapping
    CREATE OR REPLACE FUNCTION get_cat_name(cat_uuid UUID, u_id UUID) RETURNS TEXT AS $$
    DECLARE
        result TEXT;
    BEGIN
        -- Try to find category in categories table
        SELECT name INTO result
        FROM categories
        WHERE id = cat_uuid AND user_id = u_id
        LIMIT 1;
        
        -- If not found, use mapping
        IF result IS NULL THEN
            result := CASE cat_uuid::TEXT
                WHEN 'a9d19651-9e8d-49df-a83b-86d15c4862c9' THEN 'Shopping'
                WHEN 'cb6b3772-060c-40d3-82e0-4edb667e23f2' THEN 'Zabka'
                WHEN 'ed121ee8-de38-4040-b93d-f1c66237b53b' THEN 'Poland'
                WHEN '05b84783-8d67-4d8e-8c41-7b43ff0e0a30' THEN 'Other'
                WHEN '1f0281b6-8f19-4736-b2f8-36e956612db0' THEN 'HDFC CC'
                WHEN '9424e83e-14e3-4cad-bb43-89d8ef710baf' THEN 'Zabka'
                WHEN 'c0284572-c21d-4a11-91b2-f4772486b85c' THEN 'Salary'
                WHEN 'c1a54665-5c37-452f-ac94-299e682140d9' THEN 'Sports'
                WHEN '8b4df5c0-e99d-4651-a0d5-ac5ccc879dd5' THEN 'Entertainment'
                WHEN '1fca12ea-c110-4567-a429-2df0309236e2' THEN 'Bills'
                WHEN '8cfe6a6b-e50d-4bbc-b481-391b45597363' THEN 'Poland Rent'
                WHEN '1a4887a1-a4d0-41c0-a411-bf9d0dbb1bf3' THEN 'Amex cc'
                WHEN '46afa2d9-a1ef-421c-9730-9237d60223da' THEN 'TAXI'
                WHEN '9d6220ac-b11d-4ce5-b42a-55d6e62048ac' THEN 'Groceries'
                WHEN '8823467f-a2c9-4baf-b1ff-459bb41a735a' THEN 'Internet Recharge'
                WHEN 'ea7bf4a0-6009-4f67-84d8-dcf07f2e9a72' THEN 'Other'
                WHEN '40d71175-10ce-4280-b773-19e158370a25' THEN 'Transport'
                WHEN 'a817195a-5537-41d8-a100-8ded2dd5420d' THEN 'Zype'
                WHEN '77569cab-590d-44b0-b6c9-5df452bf88ba' THEN 'Other'
                WHEN '01b0b6aa-2f55-483b-b318-089600c50ab3' THEN 'Food'
                WHEN '07752d3e-be48-4fcf-b503-baedb1727fb7' THEN 'Zabka'
                WHEN '20c6539b-caf3-451c-83e9-643923cbf4c4' THEN 'Shopping'
                WHEN '2cafc1cd-0a65-4eb5-a87d-bc1afa3b4b57' THEN 'Subscriptions'
                WHEN '6622d700-dc49-4ea7-8406-bcf568d470e1' THEN 'Subscriptions'
                WHEN '642cb872-8285-4b3c-91e0-deebcb115419' THEN 'Education & Learning'
                WHEN 'd786be6c-8e98-43db-9e49-a0e1d93c9446' THEN 'Other'
                ELSE 'Other'
            END;
        END IF;
        
        RETURN result;
    END;
    $$ LANGUAGE plpgsql;
    
    -- Insert all transactions
    INSERT INTO transactions (user_id, type, amount, date, description, category, created_at) VALUES
        (user_uuid, 'expense', 250.00, '2025-05-24', 'Primark', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-05-24 15:12:38.433331+00'),
        (user_uuid, 'expense', 25.00, '2025-09-18', 'Zabka', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-19 07:18:09.594679+00'),
        (user_uuid, 'expense', 210.00, '2025-08-04', 'India', get_cat_name('ed121ee8-de38-4040-b93d-f1c66237b53b'::UUID, user_uuid), '2025-08-06 04:20:13.66532+00'),
        (user_uuid, 'expense', 270.00, '2025-09-02', 'Rakesh Shoes', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-09-05 14:35:28.726344+00'),
        (user_uuid, 'income', 2700.00, '2025-11-15', 'WD', get_cat_name('05b84783-8d67-4d8e-8c41-7b43ff0e0a30'::UUID, user_uuid), '2025-11-15 07:21:12.118621+00'),
        (user_uuid, 'expense', 7350.00, '2025-07-02', 'Credit card payment ', get_cat_name('1f0281b6-8f19-4736-b2f8-36e956612db0'::UUID, user_uuid), '2025-07-16 17:26:20.966515+00'),
        (user_uuid, 'expense', 20.00, '2025-05-09', 'Zabka', get_cat_name('9424e83e-14e3-4cad-bb43-89d8ef710baf'::UUID, user_uuid), '2025-05-09 17:54:52.066236+00'),
        (user_uuid, 'expense', 20.00, '2025-09-06', 'Zabka', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-06 18:28:05.472091+00'),
        (user_uuid, 'income', 14600.00, '2025-07-01', 'June Salary', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-07-16 06:30:30.162305+00'),
        (user_uuid, 'expense', 22.00, '2025-05-11', 'Tennis', get_cat_name('c1a54665-5c37-452f-ac94-299e682140d9'::UUID, user_uuid), '2025-05-11 20:37:50.972038+00'),
        (user_uuid, 'expense', 113.00, '2025-08-03', 'Play', get_cat_name('8b4df5c0-e99d-4651-a0d5-ac5ccc879dd5'::UUID, user_uuid), '2025-08-06 04:16:08.598211+00'),
        (user_uuid, 'expense', 730.00, '2025-11-07', 'Car Insurance ', get_cat_name('1fca12ea-c110-4567-a429-2df0309236e2'::UUID, user_uuid), '2025-11-07 03:28:34.849551+00'),
        (user_uuid, 'expense', 200.00, '2025-12-01', 'India Groceries', get_cat_name('9d6220ac-b11d-4ce5-b42a-55d6e62048ac'::UUID, user_uuid), '2025-11-29 05:03:20.385672+00'),
        (user_uuid, 'expense', 76.00, '2025-09-07', 'Haircut', get_cat_name('1fca12ea-c110-4567-a429-2df0309236e2'::UUID, user_uuid), '2025-09-07 15:54:35.045379+00'),
        (user_uuid, 'income', 14600.00, '2025-09-01', 'Salary', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-09-04 16:38:11.7644+00'),
        (user_uuid, 'expense', 35.00, '2025-08-06', 'Lyca', get_cat_name('8b4df5c0-e99d-4651-a0d5-ac5ccc879dd5'::UUID, user_uuid), '2025-08-06 04:24:49.750677+00'),
        (user_uuid, 'expense', 8.00, '2025-09-12', 'ZABKA', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-12 18:35:20.475568+00'),
        (user_uuid, 'expense', 15.00, '2025-08-04', 'Bolt', get_cat_name('46afa2d9-a1ef-421c-9730-9237d60223da'::UUID, user_uuid), '2025-08-06 04:25:24.322289+00'),
        (user_uuid, 'expense', 8400.00, '2025-04-02', 'March and April Rent', get_cat_name('8cfe6a6b-e50d-4bbc-b481-391b45597363'::UUID, user_uuid), '2025-05-12 20:39:40.757963+00'),
        (user_uuid, 'expense', 845.00, '2025-10-02', 'Anex', get_cat_name('1a4887a1-a4d0-41c0-a411-bf9d0dbb1bf3'::UUID, user_uuid), '2025-10-02 07:07:14.923473+00'),
        (user_uuid, 'expense', 150.00, '2025-09-05', 'School bag', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-09-05 14:36:36.616609+00'),
        (user_uuid, 'expense', 4200.00, '2025-10-16', 'Rent', get_cat_name('8cfe6a6b-e50d-4bbc-b481-391b45597363'::UUID, user_uuid), '2025-10-18 06:47:33.256676+00'),
        (user_uuid, 'expense', 820.00, '2025-09-02', 'AMEC', get_cat_name('1a4887a1-a4d0-41c0-a411-bf9d0dbb1bf3'::UUID, user_uuid), '2025-09-04 16:40:27.999066+00'),
        (user_uuid, 'expense', 4200.00, '2025-11-10', 'Rent', get_cat_name('8cfe6a6b-e50d-4bbc-b481-391b45597363'::UUID, user_uuid), '2025-11-15 07:22:33.004026+00'),
        (user_uuid, 'expense', 11.00, '2025-05-08', 'Zabka', get_cat_name('9424e83e-14e3-4cad-bb43-89d8ef710baf'::UUID, user_uuid), '2025-05-08 19:54:52.646996+00'),
        (user_uuid, 'expense', 1000.00, '2025-06-17', 'Zabka', get_cat_name('8823467f-a2c9-4baf-b1ff-459bb41a735a'::UUID, user_uuid), '2025-07-15 07:49:41.987845+00'),
        (user_uuid, 'expense', 860.00, '2025-11-01', 'Amax', get_cat_name('1a4887a1-a4d0-41c0-a411-bf9d0dbb1bf3'::UUID, user_uuid), '2025-11-01 04:00:26.312758+00'),
        (user_uuid, 'expense', 10.00, '2025-05-08', 'Milk', get_cat_name('9d6220ac-b11d-4ce5-b42a-55d6e62048ac'::UUID, user_uuid), '2025-05-08 22:36:13.9557+00'),
        (user_uuid, 'expense', 375.00, '2025-11-15', 'Office trip', get_cat_name('40d71175-10ce-4280-b773-19e158370a25'::UUID, user_uuid), '2025-11-15 07:14:51.725724+00'),
        (user_uuid, 'expense', 180.00, '2025-05-06', 'Play WIFI', get_cat_name('8823467f-a2c9-4baf-b1ff-459bb41a735a'::UUID, user_uuid), '2025-05-06 08:47:53.69005+00'),
        (user_uuid, 'income', 800.00, '2025-07-13', 'ZUS', get_cat_name('ea7bf4a0-6009-4f67-84d8-dcf07f2e9a72'::UUID, user_uuid), '2025-07-16 09:18:27.191508+00'),
        (user_uuid, 'expense', 180.00, '2025-11-15', 'ZARA T Shirt ', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-11-15 07:20:47.639165+00'),
        (user_uuid, 'expense', 375.00, '2025-09-05', 'Zype', get_cat_name('a817195a-5537-41d8-a100-8ded2dd5420d'::UUID, user_uuid), '2025-09-05 04:22:08.577464+00'),
        (user_uuid, 'expense', 25.00, '2025-05-13', 'Kofland', get_cat_name('9d6220ac-b11d-4ce5-b42a-55d6e62048ac'::UUID, user_uuid), '2025-05-13 18:44:12.673034+00'),
        (user_uuid, 'expense', 1000.00, '2025-08-01', 'TRC application ', get_cat_name('1fca12ea-c110-4567-a429-2df0309236e2'::UUID, user_uuid), '2025-08-06 04:26:28.798221+00'),
        (user_uuid, 'expense', 4200.00, '2025-08-06', 'Rent', get_cat_name('8cfe6a6b-e50d-4bbc-b481-391b45597363'::UUID, user_uuid), '2025-08-06 04:20:50.926839+00'),
        (user_uuid, 'expense', 500.00, '2025-04-02', 'Zabka', get_cat_name('9d6220ac-b11d-4ce5-b42a-55d6e62048ac'::UUID, user_uuid), '2025-05-12 20:40:14.40592+00'),
        (user_uuid, 'expense', 18.00, '2025-09-05', 'Groceries ', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-04 22:06:40.797876+00'),
        (user_uuid, 'expense', 16.00, '2025-05-11', 'Bolt', get_cat_name('46afa2d9-a1ef-421c-9730-9237d60223da'::UUID, user_uuid), '2025-05-11 20:27:34.987154+00'),
        (user_uuid, 'expense', 35.00, '2025-08-01', 'Bolt', get_cat_name('46afa2d9-a1ef-421c-9730-9237d60223da'::UUID, user_uuid), '2025-08-06 04:27:16.119249+00'),
        (user_uuid, 'expense', 630.00, '2025-09-10', 'Krakow', get_cat_name('40d71175-10ce-4280-b773-19e158370a25'::UUID, user_uuid), '2025-09-11 10:43:44.092554+00'),
        (user_uuid, 'expense', 4200.00, '2025-05-04', 'May Rent', get_cat_name('8cfe6a6b-e50d-4bbc-b481-391b45597363'::UUID, user_uuid), '2025-05-04 07:29:00.164402+00'),
        (user_uuid, 'expense', 85.00, '2025-09-13', 'H&M', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-09-13 21:34:13.130416+00'),
        (user_uuid, 'expense', 66.00, '2025-05-11', 'India Iceland', get_cat_name('01b0b6aa-2f55-483b-b318-089600c50ab3'::UUID, user_uuid), '2025-05-12 02:48:42.593496+00'),
        (user_uuid, 'income', 15300.00, '2025-05-01', 'March Salary', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-05-04 12:09:25.85232+00'),
        (user_uuid, 'expense', 2700.00, '2025-12-01', 'HDFC', get_cat_name('1f0281b6-8f19-4736-b2f8-36e956612db0'::UUID, user_uuid), '2025-11-29 04:59:43.810713+00'),
        (user_uuid, 'expense', 35.00, '2025-08-05', 'Cafe', get_cat_name('01b0b6aa-2f55-483b-b318-089600c50ab3'::UUID, user_uuid), '2025-08-06 04:21:12.38264+00'),
        (user_uuid, 'expense', 10.00, '2025-05-13', 'Zabka', get_cat_name('07752d3e-be48-4fcf-b503-baedb1727fb7'::UUID, user_uuid), '2025-05-13 21:27:22.786756+00'),
        (user_uuid, 'expense', 80.00, '2025-08-02', 'Reserved shopping Priya', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-08-06 04:11:24.281741+00'),
        (user_uuid, 'expense', 200.00, '2025-08-02', 'Parlor ', get_cat_name('77569cab-590d-44b0-b6c9-5df452bf88ba'::UUID, user_uuid), '2025-08-06 04:22:44.594956+00'),
        (user_uuid, 'expense', 70.00, '2025-05-23', 'SMYK', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-05-24 15:18:19.166637+00'),
        (user_uuid, 'expense', 30.00, '2025-05-11', 'Zabka', get_cat_name('07752d3e-be48-4fcf-b503-baedb1727fb7'::UUID, user_uuid), '2025-05-13 21:28:14.595121+00'),
        (user_uuid, 'expense', 140.00, '2025-08-05', 'Martes', get_cat_name('c1a54665-5c37-452f-ac94-299e682140d9'::UUID, user_uuid), '2025-08-06 04:21:55.438228+00'),
        (user_uuid, 'income', 14650.00, '2025-08-01', 'July Salary', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-07-25 12:55:31.880081+00'),
        (user_uuid, 'expense', 90.00, '2025-12-01', 'Google One', get_cat_name('6622d700-dc49-4ea7-8406-bcf568d470e1'::UUID, user_uuid), '2025-11-30 06:30:35.845924+00'),
        (user_uuid, 'expense', 2000.00, '2025-11-03', 'Priyanka', get_cat_name('77569cab-590d-44b0-b6c9-5df452bf88ba'::UUID, user_uuid), '2025-11-19 18:49:42.560967+00'),
        (user_uuid, 'expense', 15.00, '2025-09-05', 'Zabka', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-05 10:10:18.92505+00'),
        (user_uuid, 'expense', 246.00, '2025-08-06', 'Nord vpn', get_cat_name('2cafc1cd-0a65-4eb5-a87d-bc1afa3b4b57'::UUID, user_uuid), '2025-08-06 04:28:35.41474+00'),
        (user_uuid, 'expense', 200.00, '2025-11-29', 'Office', get_cat_name('40d71175-10ce-4280-b773-19e158370a25'::UUID, user_uuid), '2025-11-29 09:29:18.059677+00'),
        (user_uuid, 'expense', 18.00, '2025-08-02', 'Flying tiger', get_cat_name('20c6539b-caf3-451c-83e9-643923cbf4c4'::UUID, user_uuid), '2025-08-06 04:12:42.598267+00'),
        (user_uuid, 'expense', 210.00, '2025-05-22', 'Krakow 4 days', get_cat_name('40d71175-10ce-4280-b773-19e158370a25'::UUID, user_uuid), '2025-05-22 19:59:35.506613+00'),
        (user_uuid, 'expense', 95.00, '2025-12-01', 'Manning', get_cat_name('6622d700-dc49-4ea7-8406-bcf568d470e1'::UUID, user_uuid), '2025-11-30 06:29:28.672875+00'),
        (user_uuid, 'income', 1600.00, '2025-07-15', 'June Watch duty ', get_cat_name('05b84783-8d67-4d8e-8c41-7b43ff0e0a30'::UUID, user_uuid), '2025-07-16 09:18:58.76606+00'),
        (user_uuid, 'expense', 60.00, '2025-08-05', 'Book EPI', get_cat_name('642cb872-8285-4b3c-91e0-deebcb115419'::UUID, user_uuid), '2025-08-06 04:23:57.821216+00'),
        (user_uuid, 'expense', 15.00, '2025-05-14', 'Zabka', get_cat_name('07752d3e-be48-4fcf-b503-baedb1727fb7'::UUID, user_uuid), '2025-05-14 15:41:28.157688+00'),
        (user_uuid, 'expense', 50.00, '2025-09-05', 'Taxi', get_cat_name('46afa2d9-a1ef-421c-9730-9237d60223da'::UUID, user_uuid), '2025-09-05 21:16:28.054182+00'),
        (user_uuid, 'income', 15300.00, '2025-04-01', 'March Salary', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-05-06 13:31:43.83292+00'),
        (user_uuid, 'expense', 20.00, '2025-09-14', 'Zabka', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-15 04:42:02.94459+00'),
        (user_uuid, 'expense', 1500.00, '2025-07-02', 'Priyanka', get_cat_name('9d6220ac-b11d-4ce5-b42a-55d6e62048ac'::UUID, user_uuid), '2025-07-16 09:16:49.99976+00'),
        (user_uuid, 'expense', 3370.00, '2025-09-02', 'HDFC CC Payment', get_cat_name('1f0281b6-8f19-4736-b2f8-36e956612db0'::UUID, user_uuid), '2025-09-04 16:39:44.910734+00'),
        (user_uuid, 'income', 15000.00, '2025-11-01', 'October Salary', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-10-31 18:35:48.850744+00'),
        (user_uuid, 'expense', 35.00, '2025-09-13', 'Carafour', get_cat_name('9d6220ac-b11d-4ce5-b42a-55d6e62048ac'::UUID, user_uuid), '2025-09-13 21:34:45.277301+00'),
        (user_uuid, 'expense', 4200.00, '2025-07-01', 'July Rent', get_cat_name('8cfe6a6b-e50d-4bbc-b481-391b45597363'::UUID, user_uuid), '2025-07-16 09:13:54.426365+00'),
        (user_uuid, 'expense', 2020.00, '2025-11-01', 'HDFC CC payment ', get_cat_name('1f0281b6-8f19-4736-b2f8-36e956612db0'::UUID, user_uuid), '2025-10-31 18:38:30.506938+00'),
        (user_uuid, 'expense', 1000.00, '2025-08-01', 'Priya', get_cat_name('77569cab-590d-44b0-b6c9-5df452bf88ba'::UUID, user_uuid), '2025-08-06 04:10:19.890073+00'),
        (user_uuid, 'income', 10800.00, '2025-10-01', 'September ', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-10-02 07:06:08.667095+00'),
        (user_uuid, 'expense', 350.00, '2025-08-05', 'Zype', get_cat_name('a817195a-5537-41d8-a100-8ded2dd5420d'::UUID, user_uuid), '2025-08-06 04:29:57.017645+00'),
        (user_uuid, 'expense', 2000.00, '2025-11-19', 'HDFC', get_cat_name('1f0281b6-8f19-4736-b2f8-36e956612db0'::UUID, user_uuid), '2025-11-19 18:48:41.605238+00'),
        (user_uuid, 'expense', 4.00, '2025-05-16', 'Spar', get_cat_name('07752d3e-be48-4fcf-b503-baedb1727fb7'::UUID, user_uuid), '2025-05-16 19:13:06.570477+00'),
        (user_uuid, 'expense', 40.00, '2025-05-23', 'LEGO', get_cat_name('20c6539b-caf3-451c-83e9-643923cbf4c4'::UUID, user_uuid), '2025-05-24 15:15:25.804836+00'),
        (user_uuid, 'income', 14800.00, '2025-12-01', 'Salary', get_cat_name('c0284572-c21d-4a11-91b2-f4772486b85c'::UUID, user_uuid), '2025-11-29 04:57:29.340307+00'),
        (user_uuid, 'expense', 1500.00, '2025-07-07', 'Krakow Trip', get_cat_name('40d71175-10ce-4280-b773-19e158370a25'::UUID, user_uuid), '2025-07-16 09:13:06.951922+00'),
        (user_uuid, 'expense', 350.00, '2025-10-09', 'Humidifier ', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-10-10 03:44:27.097034+00'),
        (user_uuid, 'income', 2200.00, '2025-10-15', 'WD', get_cat_name('05b84783-8d67-4d8e-8c41-7b43ff0e0a30'::UUID, user_uuid), '2025-10-18 06:48:03.896535+00'),
        (user_uuid, 'expense', 100.00, '2025-08-04', 'Priyanka', get_cat_name('77569cab-590d-44b0-b6c9-5df452bf88ba'::UUID, user_uuid), '2025-08-06 04:24:30.718168+00'),
        (user_uuid, 'expense', 4200.00, '2025-09-05', 'September Rent', get_cat_name('8cfe6a6b-e50d-4bbc-b481-391b45597363'::UUID, user_uuid), '2025-09-04 22:07:24.548859+00'),
        (user_uuid, 'expense', 140.00, '2025-09-06', 'Reserved Jeans', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-09-06 18:27:43.877606+00'),
        (user_uuid, 'expense', 20.00, '2025-12-01', 'Tubebuddy', get_cat_name('6622d700-dc49-4ea7-8406-bcf568d470e1'::UUID, user_uuid), '2025-11-30 06:29:54.697727+00'),
        (user_uuid, 'expense', 110.00, '2025-09-14', 'Chubi Boom', get_cat_name('2cafc1cd-0a65-4eb5-a87d-bc1afa3b4b57'::UUID, user_uuid), '2025-09-15 04:41:43.264135+00'),
        (user_uuid, 'expense', 845.00, '2025-12-01', 'Amex', get_cat_name('1a4887a1-a4d0-41c0-a411-bf9d0dbb1bf3'::UUID, user_uuid), '2025-11-29 05:01:58.844235+00'),
        (user_uuid, 'expense', 20.00, '2025-09-06', 'Zabka', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-06 07:43:38.36236+00'),
        (user_uuid, 'expense', 80.00, '2025-05-14', 'Temu', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-05-14 11:57:17.518353+00'),
        (user_uuid, 'expense', 50.00, '2025-05-23', 'ANU Jacket', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-05-24 15:20:20.746866+00'),
        (user_uuid, 'expense', 118.00, '2025-07-17', 'Food', get_cat_name('01b0b6aa-2f55-483b-b318-089600c50ab3'::UUID, user_uuid), '2025-07-17 20:29:52.659421+00'),
        (user_uuid, 'expense', 888.00, '2025-08-04', 'Amex', get_cat_name('1a4887a1-a4d0-41c0-a411-bf9d0dbb1bf3'::UUID, user_uuid), '2025-08-06 04:17:32.000391+00'),
        (user_uuid, 'expense', 140.00, '2025-09-02', 'Anu Shoes', get_cat_name('a9d19651-9e8d-49df-a83b-86d15c4862c9'::UUID, user_uuid), '2025-09-05 14:36:10.216214+00'),
        (user_uuid, 'expense', 4256.00, '2025-08-03', 'Credit card payment ', get_cat_name('1f0281b6-8f19-4736-b2f8-36e956612db0'::UUID, user_uuid), '2025-08-06 04:13:22.873844+00'),
        (user_uuid, 'expense', 4225.00, '2025-05-01', '100000', get_cat_name('d786be6c-8e98-43db-9e49-a0e1d93c9446'::UUID, user_uuid), '2025-05-11 12:01:56.377705+00'),
        (user_uuid, 'expense', 30.00, '2025-09-07', 'Zabka', get_cat_name('cb6b3772-060c-40d3-82e0-4edb667e23f2'::UUID, user_uuid), '2025-09-07 15:54:54.613121+00');
    
    -- Clean up helper function
    DROP FUNCTION IF EXISTS get_cat_name(UUID, UUID);
    
    RAISE NOTICE 'Successfully added all 89 transactions for user: rakpa8@gmail.com';
END $$;

