import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    // Fix for MetaMask SDK trying to import React Native modules in web context
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
      };
      
      // Alias React Native async storage to empty module for web builds
      // Use require.resolve for better compatibility across environments
      try {
        const stubPath = path.join(process.cwd(), 'webpack-stubs', 'async-storage.js');
        config.resolve.alias = {
          ...config.resolve.alias,
          '@react-native-async-storage/async-storage': stubPath,
        };
      } catch (e) {
        // If path resolution fails, suppress the warning via console filtering instead
      }
    }
    
    return config;
  },
  // Suppress hydration warnings for client-only components
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'metadata.ens.domains',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
