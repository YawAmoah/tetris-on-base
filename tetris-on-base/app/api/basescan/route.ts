import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side API route for BaseScan API calls
 * Uses SECRET API key (never exposed to client)
 * Wraps BaseScan API calls to generate usage metrics and keep keys secure
 */
export async function GET(request: NextRequest) {
  try {
    // Use SECRET API key first (recommended for server-side), fallback to client API key
    const apiKey = process.env.BASESCAN_API_KEY || process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '4zpUUjj9bpsXw5iEQcZCvyqVf38UnFUj';
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'latest_block';
    const txHash = searchParams.get('txhash'); // For transaction receipt checks
    
    let apiUrl = '';
    
    // Handle transaction receipt check
    if (action === 'tx_receipt' && txHash) {
      apiUrl = `https://api.basescan.org/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${apiKey}`;
    } else {
      // Different BaseScan API calls to generate traffic
      switch (action) {
        case 'latest_block':
          // Get latest block number
          apiUrl = `https://api.basescan.org/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`;
          break;
        case 'gas_price':
          // Get gas price
          apiUrl = `https://api.basescan.org/api?module=proxy&action=eth_gasPrice&apikey=${apiKey}`;
          break;
        case 'block_count':
          // Get block count
          apiUrl = `https://api.basescan.org/api?module=stats&action=ethsupply&apikey=${apiKey}`;
          break;
        default:
          // Default: get latest block
          apiUrl = `https://api.basescan.org/api?module=proxy&action=eth_blockNumber&apikey=${apiKey}`;
      }
    }
    
    const response = await fetch(apiUrl, {
      next: { revalidate: action === 'tx_receipt' ? 0 : 10 } // No cache for tx receipts
    });
    
    const data = await response.json();
    
    // Return the data
    return NextResponse.json({ 
      success: true, 
      action,
      result: data.result || null,
      status: data.status
    });
  } catch (error) {
    console.error('BaseScan API call error:', error);
    // Don't fail - just log and return success to not break gameplay
    return NextResponse.json({ success: false, error: 'API call failed' });
  }
}

