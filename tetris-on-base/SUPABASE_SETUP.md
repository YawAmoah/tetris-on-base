# Supabase Setup Instructions

## Step 1: Create the Database Table

1. Go to your Supabase project: https://wvikkaroxhedgiutjgnq.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-setup.sql`
4. Run the SQL script

This will create:
- A `scores` table with all necessary columns
- Indexes for fast queries
- Row Level Security (RLS) policies that allow public read/write access

## Step 2: Verify the Setup

The API endpoints are already configured to use Supabase. The credentials are hardcoded in `lib/supabase.ts` as fallbacks, so it should work immediately.

## Step 3: (Optional) Add Environment Variables

For better security, you can create a `.env.local` file with:

```
NEXT_PUBLIC_SUPABASE_URL=https://wvikkaroxhedgiutjgnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2aWtrYXJveGhlZGdpdXRqZ25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMjMwMTAsImV4cCI6MjA3NzU5OTAxMH0._NqqMGTTxRboITtIptFqv91e9iva60-t3R77TAYb4JM
```

## Testing

Once the table is created, the leaderboard will automatically start using Supabase. Test by:
1. Playing a game
2. Saving a score on-chain
3. Check the leaderboard - it should show your score!

