"use client";

import { useState, useEffect } from "react";
import { createPublicClient, http } from "viem";
import { base, mainnet } from "viem/chains";
import { isAddress } from "viem";

interface NameDisplayProps {
  address: `0x${string}`;
}

function formatAddress(address: string): string {
  if (!address || !isAddress(address)) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Resolve Base name (Basename) - Base names use ENS protocol on Base chain
async function resolveBaseName(address: `0x${string}`): Promise<string | null> {
  try {
    const client = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Try reverse ENS lookup on Base chain
    const name = await client.getEnsName({ address }).catch(() => null);
    if (name) {
      // Check if it ends with .base.eth or similar Base-specific TLD
      // Base names typically use base.eth or similar
      return name;
    }
  } catch (error) {
    console.log("Base name resolution error:", error);
  }
  return null;
}

// Resolve Farcaster name from address
async function resolveFarcasterName(address: `0x${string}`): Promise<string | null> {
  try {
    // Try using Neynar API (requires API key - 401 is expected if not configured)
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/by_verification?address=${address}`,
      {
        method: "GET",
        headers: {
          "accept": "application/json",
        },
      }
    ).catch(() => null);

    // Only process successful responses (401/403 errors are expected without API key)
    if (response?.ok) {
      const data = await response.json();
      // Check different response structures
      if (data.result?.user?.username) {
        return data.result.user.username;
      }
      if (data.user?.username) {
        return data.user.username;
      }
    }
    // Silently ignore 401/403 errors (API key not configured is fine)
  } catch {
    // Silently fail
  }
  return null;
}

// Resolve ENS name from mainnet
async function resolveENSName(address: `0x${string}`): Promise<string | null> {
  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    const name = await client.getEnsName({ address }).catch(() => null);
    return name;
  } catch (error) {
    console.log("ENS name resolution error:", error);
  }
  return null;
}

interface NameDisplayState {
  name: string | null;
  avatar: string | null;
}

/**
 * NameDisplay component that resolves names in priority order:
 * 1. Base name (Basename) - highest priority
 * 2. Farcaster name
 * 3. ENS name
 * 4. Truncated wallet address (first 4 + last 4 chars)
 * 
 * Also fetches ENS avatars when available.
 */
export function NameDisplay({ address }: NameDisplayProps) {
  const [state, setState] = useState<NameDisplayState>({ name: null, avatar: null });
  const [loading, setLoading] = useState(true);

  // Fetch ENS avatar
  async function fetchENSAvatar(name: string): Promise<string | null> {
    try {
      // First, try to get avatar from ENS text record (most reliable)
      try {
        const client = createPublicClient({
          chain: mainnet,
          transport: http(),
        });
        const avatar = await client.getEnsText({
          name: name as `${string}.eth`,
          key: 'avatar',
        });
        if (avatar && (avatar.startsWith('http') || avatar.startsWith('ipfs://'))) {
          // Handle IPFS URLs
          if (avatar.startsWith('ipfs://')) {
            const ipfsHash = avatar.replace('ipfs://', '');
            return `https://ipfs.io/ipfs/${ipfsHash}`;
          }
          return avatar;
        }
      } catch {
        // Fallback to metadata endpoint
      }
      
      // Try ENS avatar endpoint (handles redirects)
      try {
        const avatarUrl = `https://metadata.ens.domains/mainnet/avatar/${name}/`;
        const response = await fetch(avatarUrl, { method: 'GET', redirect: 'follow' });
        if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
          return avatarUrl;
        }
      } catch {
        // Avatar endpoint failed
      }
    } catch {
      // Avatar fetch failed
    }
    return null;
  }

  useEffect(() => {
    let cancelled = false;

    async function resolveName() {
      if (!isAddress(address)) {
        setState({ name: formatAddress(address), avatar: null });
        setLoading(false);
        return;
      }

      let resolvedName: string | null = null;
      let resolvedAvatar: string | null = null;

      // Priority 1: Try Base name
      const baseName = await resolveBaseName(address);
      if (!cancelled && baseName) {
        resolvedName = baseName;
        // Try to get avatar for Base name (Base names use ENS protocol)
        resolvedAvatar = await fetchENSAvatar(baseName);
      }

      // Priority 2: Try Farcaster name (if Base name not found)
      if (!resolvedName) {
        const farcasterName = await resolveFarcasterName(address);
        if (!cancelled && farcasterName) {
          resolvedName = farcasterName;
          // Farcaster doesn't typically have ENS avatars, but we could try
        }
      }

      // Priority 3: Try ENS name (if neither Base nor Farcaster found)
      if (!resolvedName) {
        const ensName = await resolveENSName(address);
        if (!cancelled && ensName) {
          resolvedName = ensName;
          resolvedAvatar = await fetchENSAvatar(ensName);
        }
      }

      // Priority 4: Fallback to truncated address
      if (!cancelled) {
        setState({
          name: resolvedName || formatAddress(address),
          avatar: resolvedAvatar,
        });
        setLoading(false);
      }
    }

    resolveName();

    return () => {
      cancelled = true;
    };
  }, [address]);

  if (loading || !state.name) {
    return <span>{formatAddress(address)}</span>;
  }

  return <span>{state.name}</span>;
}

// Export avatar fetching function for use in Leaderboard
export async function getENSAvatar(address: `0x${string}`): Promise<string | null> {
  // Helper function to fetch avatar for a given name
  async function fetchAvatarForName(name: string): Promise<string | null> {
    try {
      // First, try to get avatar from ENS text record (most reliable)
      try {
        const client = createPublicClient({
          chain: mainnet,
          transport: http(),
        });
        const avatar = await client.getEnsText({
          name: name as `${string}.eth`,
          key: 'avatar',
        });
        if (avatar && (avatar.startsWith('http') || avatar.startsWith('ipfs://'))) {
          // Handle IPFS URLs
          if (avatar.startsWith('ipfs://')) {
            const ipfsHash = avatar.replace('ipfs://', '');
            return `https://ipfs.io/ipfs/${ipfsHash}`;
          }
          return avatar;
        }
      } catch {
        // Fallback to metadata endpoint
      }
      
      // Try ENS avatar endpoint (handles redirects)
      try {
        const avatarUrl = `https://metadata.ens.domains/mainnet/avatar/${name}/`;
        const response = await fetch(avatarUrl, { method: 'GET', redirect: 'follow' });
        if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
          return avatarUrl;
        }
      } catch {
        // Avatar endpoint failed
      }
    } catch {
      // Avatar fetch failed
    }
    return null;
  }

  // First, try to resolve the ENS name
  const ensName = await resolveENSName(address);
  if (ensName) {
    const avatar = await fetchAvatarForName(ensName);
    if (avatar) return avatar;
  }

  // Try Base name
  const baseName = await resolveBaseName(address);
  if (baseName) {
    const avatar = await fetchAvatarForName(baseName);
    if (avatar) return avatar;
  }

  return null;
}

