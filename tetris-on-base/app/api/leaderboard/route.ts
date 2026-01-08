import { NextResponse } from 'next/server';

interface ScoreEntry {
  address: string;
  score: number;
  level: number;
  linesCleared: number;
  timestamp: number;
  txHash: string;
}

// Parse transaction input data to extract score information
function parseScoreData(inputData: string): ScoreEntry | null {
  try {
    // Remove '0x' prefix if present
    const data = inputData.startsWith('0x') ? inputData.slice(2) : inputData;
    
    // The data is packed as: uint256(score) + uint8(level) + uint16(lines) + uint64(timestamp) + string
    // We need to decode this - but since it's encodePacked, we'll need to manually parse
    
    // For now, we'll look for the string pattern "Base Tetris Score:" in the data
    // and extract what we can from the hex
    
    // Check if it contains our score marker
    const scoreMarker = Buffer.from('Base Tetris Score:', 'utf-8').toString('hex');
    if (!data.toLowerCase().includes(scoreMarker.toLowerCase())) {
      return null;
    }
    
    // Try to decode - since encodePacked creates variable length data, we need to parse carefully
    // The structure is: 
    // - 32 bytes (uint256 score)
    // - 1 byte (uint8 level) 
    // - 2 bytes (uint16 lines)
    // - 8 bytes (uint64 timestamp)
    // - variable length string
    
    const hexData = Buffer.from(data, 'hex');
    
    // Read score (32 bytes, big-endian)
    const scoreBytes = hexData.slice(0, 32);
    const score = BigInt('0x' + scoreBytes.toString('hex'));
    
    // Read level (1 byte)
    const level = hexData[32];
    
    // Read lines cleared (2 bytes, big-endian)
    const linesBytes = hexData.slice(33, 35);
    const linesCleared = linesBytes.readUInt16BE(0);
    
    // Read timestamp (8 bytes, big-endian)
    const timestampBytes = hexData.slice(35, 43);
    const timestamp = Number(BigInt('0x' + timestampBytes.toString('hex')));
    
    return {
      address: '', // Will be set from transaction
      score: Number(score),
      level,
      linesCleared,
      timestamp,
      txHash: '',
    };
  } catch (err) {
    console.error('Error parsing score data:', err);
    return null;
  }
}

export async function GET() {
  try {
    // Use SECRET API key first (recommended for server-side), fallback to client API key
    const apiKey = process.env.BASESCAN_API_KEY || process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '4zpUUjj9bpsXw5iEQcZCvyqVf38UnFUj';
    
    // Query BaseScan for recent transactions
    // We'll search for transactions with data that matches our pattern
    // Note: BaseScan API doesn't have a direct way to search by data content,
    // so we'll need to track this differently or use a contract address
    
    // For now, we'll return an empty array and let the client-side component
    // track scores from localStorage or a shared state
    
    // Alternative: Use BaseScan's getTransactions endpoint and filter
    const response = await fetch(
      `https://api.basescan.org/api?module=account&action=txlist&address=0x0000000000000000000000000000000000000000&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${apiKey}`,
      { next: { revalidate: 30 } } // Cache for 30 seconds
    );
    
    const data = await response.json();
    
    const scores: ScoreEntry[] = [];
    
    if (data.status === '1' && data.result && Array.isArray(data.result)) {
      for (const tx of data.result.slice(0, 100)) {
        if (tx.input && tx.input !== '0x' && tx.input.length > 100) {
          const parsed = parseScoreData(tx.input);
          if (parsed) {
            parsed.address = tx.from;
            parsed.txHash = tx.hash;
            scores.push(parsed);
          }
        }
      }
    }
    
    // Sort by score descending and get top 10
    scores.sort((a, b) => b.score - a.score);
    const top10 = scores.slice(0, 10);
    
    return NextResponse.json({ scores: top10 });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ scores: [] }, { status: 500 });
  }
}

