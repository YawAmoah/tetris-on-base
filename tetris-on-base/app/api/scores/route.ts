import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface ScoreEntry {
  address: string;
  score: number;
  level: number;
  linesCleared: number;
  timestamp: number;
  txHash: string;
}

// GET - Fetch top scores from Supabase
export async function GET() {
  try {
    console.log('API: Fetching scores from Supabase...');
    const { data, error } = await supabase
      .from('scores')
      .select('address, score, level, lines_cleared, timestamp, tx_hash')
      .order('score', { ascending: false })
      .limit(10);

    if (error) {
      console.error('API: Supabase error fetching scores:', error);
      console.error('API: Error details:', JSON.stringify(error, null, 2));
      // Return error details in development
      return NextResponse.json({ 
        scores: [], 
        error: error.message,
        hint: error.code === 'PGRST116' ? 'Table "scores" does not exist. Please run the SQL setup script in Supabase.' : undefined
      }, { status: 500 });
    }

    console.log('API: Fetched data from Supabase:', data);

    // Transform database fields to match frontend interface
    // Filter out scores of 0
    const scores: ScoreEntry[] = (data || [])
      .map((row: Record<string, unknown>) => ({
        address: String(row.address),
        score: parseInt(String(row.score), 10),
        level: (row.level as number) || 1,
        linesCleared: (row.lines_cleared as number) || 0,
        timestamp: parseInt(String(row.timestamp), 10),
        txHash: String(row.tx_hash),
      }))
      .filter((entry) => entry.score > 0); // Filter out scores of 0

    console.log('API: Returning', scores.length, 'scores');
    return NextResponse.json({ scores });
  } catch (error) {
    console.error('API: Error fetching scores:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      scores: [], 
      error: errorMessage
    }, { status: 500 });
  }
}

// POST - Submit a new score to Supabase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, score, level, linesCleared, timestamp, txHash } = body;

    // Validate required fields
    if (!address || typeof score !== 'number' || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: address, score, txHash' },
        { status: 400 }
      );
    }

    // Don't allow saving scores of 0
    if (score <= 0) {
      return NextResponse.json(
        { error: 'Cannot save a score of 0 or less' },
        { status: 400 }
      );
    }

    // Check if this exact score already exists (by txHash to prevent duplicates)
    const { data: existing, error: checkError } = await supabase
      .from('scores')
      .select('*')
      .eq('tx_hash', txHash)
      .maybeSingle();

    // If table doesn't exist, checkError will have the error
    if (checkError && checkError.code !== 'PGRST116') {
      // Ignore "no rows" error, but log other errors
      console.warn('API: Error checking for existing score:', checkError);
    }

    if (existing) {
      return NextResponse.json({ 
        message: 'Score already exists', 
        score: {
          address: existing.address,
          score: Number(existing.score),
          level: existing.level,
          linesCleared: existing.lines_cleared,
          timestamp: Number(existing.timestamp),
          txHash: existing.tx_hash,
        }
      });
    }

    // Insert new score into Supabase
    console.log('API: Inserting score:', { address: address.toLowerCase(), score, level, lines_cleared: linesCleared, timestamp, tx_hash: txHash });
    
    const { data: newScore, error: insertError } = await supabase
      .from('scores')
      .insert({
        address: address.toLowerCase(),
        score: score,
        level: level || 1,
        lines_cleared: linesCleared || 0,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        tx_hash: txHash,
      })
      .select()
      .single();

    if (insertError) {
      console.error('API: Supabase error saving score:', insertError);
      console.error('API: Error details:', JSON.stringify(insertError, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to save score: ' + insertError.message,
          code: insertError.code,
          hint: insertError.code === 'PGRST116' ? 'Table "scores" does not exist. Please run the SQL setup script in Supabase.' : undefined
        },
        { status: 500 }
      );
    }

    console.log('API: Score inserted successfully:', newScore);

    // Get rank (count of scores higher than this one)
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('score', score);

    const rank = (count || 0) + 1;

    console.log('Score saved to Supabase:', newScore);

    return NextResponse.json({ 
      message: 'Score saved successfully', 
      score: {
        address: newScore.address,
        score: Number(newScore.score),
        level: newScore.level,
        linesCleared: newScore.lines_cleared,
        timestamp: Number(newScore.timestamp),
        txHash: newScore.tx_hash,
      },
      rank
    });
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    );
  }
}

