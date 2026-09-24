import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/theme-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ascendara Webview",
  description: "Discover games, explore your cloud library, and stay connected to your Ascendara desktop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fafafa" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const bgColors = {
                    light: '#fafafa', blue: '#eff6ff', purple: '#faf5ff',
                    emerald: '#ecfdf5', rose: '#fff1f2', amber: '#fffbeb',
                    dark: '#0f172a', midnight: '#020617', cyberpunk: '#111827',
                    sunset: '#1e293b', forest: '#141e1b', ocean: '#0f172a'
                  };
                  const savedTheme = localStorage.getItem('ascendara-theme');
                  const themes = {
                    'dark': 'dark', 'midnight': 'dark', 'cyberpunk': 'dark',
                    'sunset': 'dark', 'forest': 'dark', 'ocean': 'dark'
                  };
                  
                  let isDark = false;
                  let activeTheme = savedTheme;
                  
                  if (savedTheme && themes[savedTheme]) {
                    isDark = themes[savedTheme] === 'dark';
                  } else {
                    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    activeTheme = isDark ? 'dark' : 'light';
                  }
                  
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }

                  const meta = document.querySelector('meta[name="theme-color"]');
                  if (meta) {
                    meta.setAttribute('content', bgColors[activeTheme] || (isDark ? bgColors.dark : bgColors.light));
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
