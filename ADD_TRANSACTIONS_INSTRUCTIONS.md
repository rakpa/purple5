# Add Transactions to Your Account

## Quick Steps

1. **Make sure you're signed in** with `rakpa8@gmail.com` in your app

2. **Make sure categories are added first**:
   - Run `add-user-categories.sql` first if you haven't already
   - This ensures all category names exist

3. **Go to Supabase SQL Editor**:
   https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

4. **Open the file** `add-user-transactions-improved.sql` in your project

5. **Copy ALL the SQL code** from that file

6. **Paste it into the Supabase SQL Editor**

7. **Click Run** (or press Ctrl+Enter)

8. **Verify**: Go to your app → Transactions page → You should see all the transactions!

## What Gets Added

This script will add **89 transactions** including:
- Income transactions (Salaries, ZUS, WD, etc.)
- Expense transactions (Rent, Shopping, Food, Credit card payments, etc.)
- All with correct dates, amounts, descriptions, and categories

## Category Mapping

The script maps category_id values to category names:
- Credit card payments → HDFC CC or Amex cc
- Rent payments → Poland Rent
- Salary payments → Salary
- Shopping items → Shopping
- Food items → Food
- Zabka purchases → Zabka
- Transport → TAXI or Transport
- And more...

## Important Notes

- **Dates**: All dates are preserved exactly as provided
- **Amounts**: All amounts are preserved exactly as provided
- **Descriptions**: All descriptions are preserved exactly as provided
- **Categories**: Mapped from category_id to category name based on the data patterns

## If Some Categories Don't Match

If you see transactions with wrong categories, you can:
1. Edit them in the app
2. Or update them directly in Supabase Table Editor

## Troubleshooting

### "User not found" error
- Make sure you're signed in with `rakpa8@gmail.com` in your app first

### "Category does not exist" errors
- Make sure you've run `add-user-categories.sql` first
- The category names must match exactly (case-sensitive)

### Transactions not showing
- Refresh your app
- Check the date filters - some transactions might be in different months
- Verify the user_id matches your account

