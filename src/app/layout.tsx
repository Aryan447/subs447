import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SubSearch - Classic Cinema Subtitles",
  description: "Experience the golden age of subtitle searching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen flex flex-col`}
      >
        <header className="border-b border-gold/30 py-6 px-6 bg-red-theater/10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-serif font-bold tracking-tighter text-gold-gradient uppercase">
                SubSearch
              </span>
            </div>
            <nav>
              <ul className="flex gap-8 text-sm font-bold uppercase tracking-widest text-gold/60">
                <li><a href="/" className="hover:text-gold transition-colors">Premiere</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">About</a></li>
              </ul>
            </nav>
          </div>
        </header>
        
        <main className="flex-grow">
          {children}
        </main>
        
        <footer className="border-t border-gold/20 py-10 px-6 text-center text-gold/40 text-xs uppercase tracking-[0.2em] bg-crimson/20">
          <div className="max-w-7xl mx-auto">
            <p className="mb-2">© {new Date().getFullYear()} SubSearch Cinema.</p>
            <p>Curated Subtitles • Powered by Public Archives</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
