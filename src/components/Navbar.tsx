'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, UtensilsCrossed, MapPin } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '/', label: 'Home' },
{ href: "/restaurants", label: "Restaurants" },
    { href: "/blog", label: "Blog" },
    { href: "/photo-challenge", label: "📸 Photo Challenge" },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={
        scrolled
          ? {
              background: 'rgba(250,248,245,0.92)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              borderBottom: '1px solid var(--warm-border)',
              boxShadow: '0 1px 16px rgba(28,25,23,0.06)',
            }
          : {}
      }
    >
      <nav
        className="container-xl"
        style={{ height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
            style={{ background: 'var(--primary)' }}
          >
            <MapPin className="w-4.5 h-4.5 text-white" />
          </div>
          <span
            className="font-serif text-xl"
            style={{ letterSpacing: '-0.01em', color: 'var(--text)' }}
          >
            Paris,{' '}
            <span style={{ color: 'var(--primary)' }}>Ontario</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div
          className="hidden md:flex items-center gap-8"
          style={{ height: '68px' }}
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">
              {l.label}
            </Link>
          ))}
          <Link
            href="/restaurants"
            className="btn-primary text-sm py-2.5 px-5"
            style={{ borderRadius: '10px' }}
          >
            <UtensilsCrossed className="w-4 h-4" />
            Explore Dining
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2.5 rounded-xl transition-colors"
          style={{
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: scrolled ? 'var(--warm-bg)' : 'transparent',
          }}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="w-5 h-5" style={{ color: 'var(--text)' }} />
          ) : (
            <Menu className="w-5 h-5" style={{ color: scrolled ? 'var(--text)' : 'white' }} />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            background: 'rgba(250,248,245,0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--warm-border)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="container-xl py-4 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  fontWeight: 500,
                  fontSize: '1rem',
                  color: 'var(--text)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--primary-xlight)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/restaurants"
              className="btn-primary justify-center mt-3"
              onClick={() => setMobileOpen(false)}
            >
              <UtensilsCrossed className="w-4 h-4" />
              Explore Dining
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
