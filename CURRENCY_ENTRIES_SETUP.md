# Currency Entries Setup Instructions

## Database Setup

1. **Go to Supabase SQL Editor**:
   https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new

2. **Open the file** `supabase-currency-entries-setup.sql` in your project

3. **Copy ALL the SQL code** from that file

4. **Paste it into the Supabase SQL Editor**

5. **Click Run** (or press Ctrl+Enter)

## What Gets Created

- **Table**: `currency_entries`
  - Stores PLN and INR amounts for India transactions
  - Includes date, description, and both currency amounts
  - Automatically links to user accounts via `user_id`

- **Indexes**: 
  - Index on `date` for faster date-based queries
  - Index on `user_id` for faster user-specific queries

- **Row Level Security (RLS)**:
  - Users can only view/edit/delete their own entries
  - Automatic user_id assignment on insert

- **Triggers**:
  - Automatically updates `updated_at` timestamp on record updates

## Features

The India page now includes:

1. **Currency Entry Form**:
   - Date picker
   - Description input
   - PLN amount input
   - INR amount input
   - Add button (blue)
   - Edit button (pink-purple gradient) - appears when editing

2. **Currency Entries List**:
   - Shows all entries with date, description, PLN, and INR amounts
   - Edit and Delete buttons (appear on hover)
   - Filtered by date range

3. **Full CRUD Operations**:
   - Create new entries
   - Read/View all entries
   - Update existing entries
   - Delete entries

## Usage

1. Fill in the form fields
2. Click "ADD" to create a new entry
3. Click the edit icon on any entry to modify it
4. Click "EDIT" button to cancel editing
5. Click the delete icon to remove an entry

All entries are automatically filtered by the selected date range and are user-specific.

