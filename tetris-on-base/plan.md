# Banger App - Project Plan & Architecture

## Project Overview

**Banger App** is a Next.js-based Farcaster Mini App built with Coinbase OnchainKit and MiniKit. It enables users to interact with Web3 functionality directly within the Farcaster ecosystem, providing wallet integration, transaction capabilities, and seamless blockchain interactions on the Base network.

## Tech Stack

### Core Framework
- **Next.js 15.3.4** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety

### Blockchain & Web3
- **OnchainKit** (`@coinbase/onchainkit`) - Coinbase's Web3 UI component library
- **Wagmi 2.16.3** - React Hooks for Ethereum
- **Viem 2.31.6** - TypeScript Ethereum library
- **Base Chain** - L2 blockchain network

### Farcaster Integration
- **MiniKit** (`@coinbase/onchainkit/minikit`) - Farcaster Mini App SDK
- **@farcaster/miniapp-sdk** - Core Farcaster Mini App functionality
- **@farcaster/quick-auth** - Authentication and user verification

### Utilities
- **TanStack React Query 5.81.5** - Data fetching and caching
- **Vercel** - Deployment platform

## Architecture Overview

The application follows a layered architecture pattern:

```
┌─────────────────────────────────────────┐
│   Farcaster Client (Mobile/Web)         │
│   - Launches Mini App                   │
│   - Provides user context               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   Next.js Application Layer             │
│   ┌──────────────────────────────────┐  │
│   │   Root Layout (layout.tsx)       │  │
│   │   - Metadata & SEO               │  │
│   │   - SafeArea wrapper             │  │
│   └──────────────┬───────────────────┘  │
│                  │                       │
│   ┌──────────────▼───────────────────┐  │
│   │   RootProvider (rootProvider.tsx)│  │
│   │   - OnchainKitProvider           │  │
│   │   - MiniKit configuration        │  │
│   │   - Wallet modal setup           │  │
│   └──────────────┬───────────────────┘  │
│                  │                       │
│   ┌──────────────▼───────────────────┐  │
│   │   Page Components                │  │
│   │   - Home page (page.tsx)         │  │
│   │   - Uses MiniKit hooks           │  │
│   │   - Wallet component             │  │
│   └──────────────┬───────────────────┘  │
│                  │                       │
│   ┌──────────────▼───────────────────┐  │
│   │   API Routes                     │  │
│   │   - /api/auth (route.ts)         │  │
│   │   - JWT verification             │  │
│   │   - User authentication          │  │
│   └──────────────────────────────────┘  │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│   External Services                     │
│   - Base Network (RPC)                  │
│   - OnchainKit API                      │
│   - Farcaster Protocol                  │
└─────────────────────────────────────────┘
```

## Core Components & How They Work Together

### 1. Configuration Layer (`minikit.config.ts`)

**Purpose**: Central configuration for the Mini App manifest and account association.

**Key Configuration**:
- **Mini App Manifest**: Defines app metadata (name, description, icons, screenshots)
- **Account Association**: Cryptographic proof linking the app to a Farcaster account
- **URL Configuration**: Dynamic URL resolution for development and production
- **Webhook URL**: Endpoint for receiving notifications from Farcaster

**How it works**: This config is consumed by:
- `layout.tsx` - Generates Farcaster metadata for discovery
- `.well-known/farcaster.json` route - Provides manifest to Farcaster clients
- MiniKit SDK - Configures the Mini App runtime

### 2. Root Layout (`app/layout.tsx`)

**Purpose**: Root component that wraps the entire application and sets up metadata.

**Key Features**:
- **Metadata Generation**: Creates Farcaster Mini App metadata (`fc:miniapp`) for client discovery
- **Font Loading**: Loads Inter and Source Code Pro from Google Fonts
- **SafeArea Wrapper**: Ensures content respects mobile safe areas (notches, status bars)
- **RootProvider**: Wraps children with OnchainKit provider

**Data Flow**:
```
Layout → Metadata API → Farcaster Client discovers app
Layout → RootProvider → Provides Web3 context
Layout → SafeArea → Wraps all page content
```

### 3. Root Provider (`app/rootProvider.tsx`)

**Purpose**: Sets up the Web3 and MiniKit context for the entire application.

**Configuration**:
- **OnchainKitProvider**: Main provider for OnchainKit components
  - `apiKey`: OnchainKit API key (from environment)
  - `chain`: Base network
  - `appearance.mode`: Auto (respects system theme)
  - `wallet.display`: Modal-based wallet connection
  - `wallet.preference`: All wallets supported

- **MiniKit Configuration**:
  - `enabled: true` - Activates MiniKit functionality
  - `autoConnect: true` - Automatically connects when in Farcaster context
  - `notificationProxyUrl`: Optional notification endpoint

**How it works**:
1. Detects if running in Farcaster Mini App context
2. Provides wallet connection via OnchainKit
3. Exposes MiniKit hooks to child components
4. Handles Web3 state management (via Wagmi internally)

### 4. Home Page (`app/page.tsx`)

**Purpose**: Main application interface demonstrating MiniKit integration.

**Key Features**:
- **MiniKit Initialization**: Uses `useMiniKit()` hook to signal app readiness
- **Wallet Component**: Displays wallet connection UI in header
- **Component Showcase**: Links to OnchainKit component documentation

**Lifecycle Flow**:
```
1. Component mounts
2. useMiniKit() hook initializes
3. useEffect detects !isMiniAppReady
4. Calls setMiniAppReady() → Signals to Farcaster client
5. Farcaster client enables full functionality
```

**Optional Authentication**:
- Commented out `useQuickAuth` hook demonstrates how to verify user identity
- Would call `/api/auth` endpoint to validate JWT token
- Returns user's Farcaster ID (FID)

### 5. Authentication API (`app/api/auth/route.ts`)

**Purpose**: Verifies user identity via Farcaster Quick Auth.

**How it works**:
1. **Request Reception**: Receives GET request with `Authorization: Bearer <token>` header
2. **Token Extraction**: Extracts JWT token from Authorization header
3. **Domain Verification**: Determines request domain (handles Vercel environments)
4. **JWT Verification**: Uses `@farcaster/quick-auth` to verify token signature
5. **User Identification**: Extracts user FID from `payload.sub`
6. **Response**: Returns user FID (can be extended to return user profile data)

**Environment Handling**:
- Production: Uses `NEXT_PUBLIC_URL`
- Vercel Preview: Uses `VERCEL_URL`
- Local: Falls back to `localhost:3000`

**Security**: 
- Token must be valid and signed by Farcaster
- Domain must match the request origin
- Returns 401 for missing/invalid tokens

### 6. Styling System

**Global Styles** (`app/globals.css`):
- CSS variables for theming (light/dark mode)
- Typography setup
- Base resets and code styling

**Component Styles** (`app/page.module.css`):
- CSS Modules for scoped styling
- Grid-based layout
- Responsive design with clamp() for fluid typography

## Data Flow & Integration

### Mini App Launch Flow

```
1. User opens Farcaster client (mobile/web)
2. Client discovers app via fc:miniapp metadata
3. User taps to launch Mini App
4. Farcaster client loads app from homeUrl (ROOT_URL)
5. Layout.tsx provides manifest metadata
6. RootProvider initializes OnchainKit + MiniKit
7. Page component calls setMiniAppReady()
8. Farcaster client receives ready signal
9. App gains access to user context (FID, wallet, etc.)
```

### Wallet Connection Flow

```
1. User clicks Wallet component in header
2. OnchainKit opens wallet modal
3. User selects wallet (Coinbase Wallet, MetaMask, etc.)
4. Wagmi (via OnchainKit) handles connection
5. Wallet connected to Base network
6. User can now interact with blockchain features
```

### Authentication Flow (Optional - Currently Commented Out)

```
1. User wants to verify identity
2. useQuickAuth hook is called with /api/auth endpoint
3. MiniKit SDK automatically includes Authorization header with JWT
4. API route verifies JWT token
5. Returns user FID if valid
6. Component receives user FID for personalized features
```

## File Structure

```
/app
  ├── api/
  │   └── auth/
  │       └── route.ts          # Authentication endpoint
  ├── page.tsx                  # Main home page
  ├── page.module.css           # Page-specific styles
  ├── layout.tsx                # Root layout with metadata
  ├── rootProvider.tsx          # OnchainKit + MiniKit provider
  └── globals.css               # Global styles

/config
  └── minikit.config.ts         # Mini App configuration

/public
  ├── icon.png                  # App icon
  ├── splash.png                # Splash screen
  ├── hero.png                  # Hero image
  └── sphere.svg                # Logo graphic
```

## Key Environment Variables

```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY  # Required: OnchainKit API key
NEXT_PUBLIC_URL                 # Production URL (optional, auto-detected)
VERCEL_URL                      # Auto-set by Vercel (optional)
```

## Development Workflow

1. **Local Development**:
   ```bash
   npm run dev
   ```
   - Runs on `http://localhost:3000`
   - Can test in browser (limited MiniKit features)
   - Full MiniKit features require Farcaster client

2. **Production Deployment**:
   - Deploy to Vercel
   - Set `NEXT_PUBLIC_ONCHAINKIT_API_KEY` in environment variables
   - App automatically detects production URL
   - Farcaster clients can discover and launch app

## Extension Points

### Adding New Features

1. **New Pages**: Create routes in `/app` directory
2. **New API Routes**: Add to `/app/api` directory
3. **OnchainKit Components**: Import from `@coinbase/onchainkit/*`
   - Transaction, Swap, Checkout, Identity components available
4. **User Authentication**: Uncomment and customize `useQuickAuth` in `page.tsx`
5. **Webhooks**: Implement endpoint at `/api/webhook` (configured in minikit.config.ts)

### Available OnchainKit Components

- **Transaction**: Send transactions on Base
- **Swap**: Token swapping interface
- **Checkout**: Payment flows
- **Wallet**: Wallet connection UI (currently used)
- **Identity**: User profile display

## Security Considerations

1. **JWT Verification**: Always verify tokens in API routes
2. **Domain Validation**: Ensures tokens are from correct domain
3. **API Key Security**: Keep OnchainKit API key in environment variables
4. **Account Association**: Cryptographic proof prevents domain hijacking

## Future Enhancements

1. Implement user authentication with `useQuickAuth`
2. Add transaction functionality with Transaction component
3. Implement webhook endpoint for notifications
4. Add user profile display with Identity component
5. Integrate token swapping with Swap component
6. Add checkout flows for payments

