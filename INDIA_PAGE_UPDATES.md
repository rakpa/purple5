# India Page Updates

## Summary
This document describes the updates made to the India page to add:
1. Category field to currency entries
2. Dashboard section similar to main dashboard
3. Recent transactions display

## Database Migration Required

**IMPORTANT**: Before using the new features, you must run the SQL migration to add the category field to the database.

### Steps:
1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/ggpxsxanqpapwyqnfivv/sql/new
2. Open the file `add-category-to-currency-entries.sql` in your project
3. Copy ALL the SQL code from that file
4. Paste it into the Supabase SQL Editor
5. Click Run (or press Ctrl+Enter)

This will:
- Add a `category` column to the `currency_entries` table
- Create an index on the category field for faster queries

## Changes Made

### 1. TypeScript Types Updated
- Updated `CurrencyEntry` interface to include optional `category` field
- Updated `CurrencyEntryInsert` interface to include optional `category` field
- Updated `CurrencyEntryUpdate` interface to include optional `category` field

### 2. India Page Updates

#### Added Category Field to Form
- Added category dropdown selector in the "Add Currency Entry" form
- Category field is optional (users can leave it blank)
- Categories are fetched from the categories table and displayed with icons

#### Added Dashboard Section
- **Financial Overview Card**: Shows breakdown charts for PLN and INR by category
  - Tabs to switch between PLN and INR breakdowns
  - Bar charts showing category-wise spending
  - Color-coded categories
- **Recent Currency Entries Card**: 
  - Shows the 10 most recent entries
  - Search functionality to filter entries
  - Displays category with icons
  - Shows both PLN and INR amounts
  - Edit and delete actions (on hover for desktop)

#### Updated Currency Entries Table
- Added "Category" column to the table
- Category is displayed with icon (if available)
- Shows "Uncategorized" or "-" for entries without category

## Features

### Category Selection
- Users can select a category from the dropdown when adding/editing entries
- Categories are displayed with their icons for better visual recognition
- Category is optional - entries can be created without a category

### Dashboard Analytics
- **PLN Breakdown**: Bar chart showing PLN amounts grouped by category
- **INR Breakdown**: Bar chart showing INR amounts grouped by category
- Color-coded categories for easy identification
- Legend showing category names and amounts

### Recent Entries
- Displays up to 10 most recent entries
- Search functionality to filter by description or category
- Shows category icon, description, date, and both currency amounts
- Quick edit and delete actions

## Usage

1. **Adding a Category to Entry**:
   - Fill in the form fields (Date, Description, PLN Amount, INR Amount)
   - Optionally select a category from the dropdown
   - Click "ADD" to create the entry

2. **Viewing Dashboard**:
   - The dashboard automatically shows data for the selected date range
   - Switch between PLN and INR tabs to see different breakdowns
   - Use the search bar in Recent Entries to find specific transactions

3. **Editing Entries**:
   - Click "EDIT" button to enable edit mode
   - Click the edit icon on any entry to modify it
   - Update the category if needed
   - Click "UPDATE" to save changes

## Notes

- The category field is optional - existing entries without categories will show as "Uncategorized" in charts
- All entries are automatically filtered by the selected date range
- The dashboard updates in real-time when entries are added, updated, or deleted
