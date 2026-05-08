# Add Categories to Your Account

## Quick Steps

1. **Make sure you're signed in** with `rakpa8@gmail.com` in your app

2. **Go to Supabase SQL Editor**:
   https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

3. **Open the file** `add-user-categories.sql` in your project

4. **Copy ALL the SQL code** from that file

5. **Paste it into the Supabase SQL Editor**

6. **Click Run** (or press Ctrl+Enter)

7. **Verify**: Go to your app → Categories page → You should see all the new categories!

## Categories That Will Be Added

All these categories will be added as **Expense** categories:

- Food
- B
- Amex cc
- HDFC CC
- Other
- Anu Toys
- Papa
- Entertainment
- Krakow
- TAXI
- Education & Learning
- Subscriptions
- Priya Poland Transfer
- Bills
- Internet Recharge
- Poland Rent
- Water
- Wroclaw
- Transport
- Groceries
- Zype
- Shopping
- Sports
- Zabka
- Poland
- ICICI CC
- Priya India transfer

## Icons Assigned

Each category has been assigned an appropriate icon:
- Credit Cards → CreditCard icon
- Food/Groceries → UtensilsCrossed/ShoppingBag
- Transport/TAXI → Car icon
- Rent → Home icon
- Entertainment → Film icon
- Education → Book icon
- Sports → Dumbbell icon
- Locations (Krakow, Wroclaw, Poland) → MapPin icon
- Transfers → ArrowRightLeft icon
- And more...

## Troubleshooting

### "User not found" error
- Make sure you're signed in with `rakpa8@gmail.com` in your app first
- The user must exist in the auth.users table

### Categories already exist
- The script uses `ON CONFLICT DO NOTHING`, so it won't create duplicates
- If a category already exists, it will be skipped

### Want to add more categories later?
- You can run the script again - it will only add new ones
- Or add them manually through the Categories page in your app

