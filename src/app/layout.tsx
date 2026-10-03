import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ConfirmHost } from "@/components/ConfirmDialog";
import { PwaRegister } from "@/components/PwaRegister";
import { ScreenShield } from "@/components/ScreenShield";
import { ThemeColorSync } from "@/components/ThemeColorSync";
import { APP_NAME, APP_TAGLINE, ICONS } from "@/lib/brand";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// One family for everything: weight and size carry the hierarchy.
// latin-ext is preloaded because it holds the rupee sign shown on every price.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s | ${APP_NAME}` },
  description: APP_TAGLINE,
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: ICONS.svg, type: "image/svg+xml" },
      { url: ICONS.favicon, sizes: "48x48", type: "image/png" },
    ],
    apple: ICONS.apple,
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme/data-accent are set by THEME_INIT_SCRIPT before hydration.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <ThemeColorSync />
        <PwaRegister />
        <ConfirmHost />
        <ScreenShield />
      </body>
    </html>
  );
}
