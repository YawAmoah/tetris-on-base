import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { minikitConfig } from "@/minikit.config";
import { ClientProviders } from "./components/ClientProviders";
import "./polyfills";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const primaryImageUrl = minikitConfig.miniapp.heroImageUrl;

  return {
    title: minikitConfig.miniapp.ogTitle || minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.ogDescription || minikitConfig.miniapp.description,
    openGraph: {
      title: minikitConfig.miniapp.ogTitle || minikitConfig.miniapp.name,
      description: minikitConfig.miniapp.ogDescription || minikitConfig.miniapp.description,
      images: [primaryImageUrl],
    },
    other: {
      "fc:miniapp": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: primaryImageUrl,
        button: {
          title: minikitConfig.miniapp.buttonTitle || `Launch ${minikitConfig.miniapp.name}`,
          action: {
            type: "launch_frame",
            url: minikitConfig.miniapp.homeUrl,
            name: minikitConfig.miniapp.name,
            splashImageUrl: minikitConfig.miniapp.splashImageUrl,
            splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor,
          },
        },
      }),
      // Backward compatibility for legacy Mini Apps
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: primaryImageUrl,
        button: {
          title: minikitConfig.miniapp.buttonTitle || `Launch ${minikitConfig.miniapp.name}`,
          action: {
            type: "launch_frame",
            url: minikitConfig.miniapp.homeUrl,
            name: minikitConfig.miniapp.name,
            splashImageUrl: minikitConfig.miniapp.splashImageUrl,
            splashBackgroundColor: minikitConfig.miniapp.splashBackgroundColor,
          },
        },
      }),
    },
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${sourceCodePro.variable}`} suppressHydrationWarning>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
