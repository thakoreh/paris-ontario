'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Utensils, MapPin } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/restaurants', label: 'Restaurants' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-sm border-b border-[var(--border)]' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center group-hover:scale-105 transition-transform">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-serif text-xl text-[var(--text)]">
            Paris, <span style={{ color: 'var(--primary)' }}>Ontario</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">
              {l.label}
            </Link>
          ))}
          <Link href="/restaurants" className="btn-primary text-sm py-2 px-4">
            <Utensils className="w-4 h-4" />
            Explore Dining
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-[var(--border)] transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-[var(--border)] px-4 py-4 flex flex-col gap-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="py-2 px-3 rounded-lg hover:bg-[var(--primary-light)] text-[var(--text)] font-medium transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/restaurants"
            className="btn-primary justify-center"
            onClick={() => setMobileOpen(false)}
          >
            <Utensils className="w-4 h-4" />
            Explore Dining
          </Link>
        </div>
      )}
    </header>
  );
}
