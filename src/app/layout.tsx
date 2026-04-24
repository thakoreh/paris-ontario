import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Paris, Ontario — Discover the Riverside Gem',
  description:
    'Your guide to Paris, Ontario — a charming heritage town on the Grand River. Discover local restaurants, cafés, pubs, and hidden gems with real-time open status, filters, and community upvotes.',
  keywords:
    'Paris Ontario, Grand River, restaurants Paris Ontario, Paris Ontario dining, things to do Paris Ontario, heritage town Ontario, Paris Ontario café',
  openGraph: {
    title: 'Paris, Ontario — Discover the Riverside Gem',
    description:
      'A charming heritage town on the Grand River. Discover local restaurants, cafés, and hidden gems.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='8' fill='%230D9488'/><text x='50%25' y='56%25' text-anchor='middle' dominant-baseline='middle' font-family='Georgia,serif' font-size='18' font-weight='bold' fill='white'>P</text></svg>" />
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
