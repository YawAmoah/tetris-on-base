const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
  "http://localhost:3000";

/**
 * MiniApp configuration object. Must follow the mini app manifest specification.
 *
 * @see {@link https://docs.base.org/mini-apps/features/manifest}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjE5MTg1LCJ0eXBlIjoiY3VzdG9keSIsImtleSI6IjB4MjljMTRBREE5MTAyNTFhNzEyNzQ1MTlhODU1MDQyZDIxODZlMzE0ZiJ9",
    payload: "eyJkb21haW4iOiJ0ZXRyaXMtb24tYmFzZS52ZXJjZWwuYXBwIn0",
    signature: "MHg0MTZmMGRjYjM4NmFiNTI5NjQ0ZjQ1YmVjNDBjNThlOWI2MGJhYmI5NmRhYzY0ZTA3ZjdlYjlkODRjNWZlOGFiNDFjNzNiNjdjZGNkZjhlMWNhMzNhODBkZjIzNWMyZDE5ZTEzNTY2OGM1MWMxY2U2NmM5ZTI0YzA5MjE0OWZjNzFj",
  },
  baseBuilder: {
    ownerAddress: "0xA01A06A7571b416A10C49242Fc0C46B5360215EA",
  },
  miniapp: {
    version: "1",
    name: "Tetris On Base",
    subtitle: "Play Tetris on Base blockchain",
    description: "Classic Tetris game on Base. Play, compete, and save your high scores on-chain!",
    screenshotUrls: [],
    imageUrl: "https://tetris-on-base.vercel.app/image.png",
    iconUrl: "https://tetris-on-base.vercel.app/icon.png",
    splashImageUrl: "https://tetris-on-base.vercel.app/splash.png",
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "games",
    tags: ["gaming", "tetris", "base", "onchain"],
    heroImageUrl: "https://tetris-on-base.vercel.app/hero.png",
    tagline: "Classic Tetris on Base",
    ogTitle: "Tetris On Base",
    ogDescription: "Play Tetris on Base blockchain. Compete and save your high scores on-chain!",
    buttonTitle: "🎮 Play Tetris",
  },
} as const;
