'use client';

import Link from 'next/link';
import { MapPin, Link2, X } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      style={{
        background: 'var(--text)',
        color: 'rgba(255,255,255,0.7)',
        marginTop: 'auto',
      }}
    >
      {/* Main footer */}
      <div className="container-xl py-16">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '3rem 2rem',
          }}
        >
          {/* Brand column */}
          <div style={{ gridColumn: 'span 1' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-serif text-xl"
                style={{ color: 'white', letterSpacing: '-0.01em' }}
              >
                Paris, <span style={{ color: 'var(--primary-light)' }}>Ontario</span>
              </span>
            </Link>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, maxWidth: '240px', color: 'rgba(255,255,255,0.5)' }}>
              A charming heritage town on the Grand River. Discover local restaurants, cafés, and hidden gems.
            </p>
          </div>

          {/* Explore column */}
          <div>
            <h4
              style={{
                color: 'white',
                fontFamily: "'Playfair Display', serif",
                fontSize: '0.9375rem',
                fontWeight: 600,
                marginBottom: '1rem',
                letterSpacing: '0.01em',
              }}
            >
              Explore
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { href: '/', label: 'Home' },
                { href: '/restaurants', label: 'Restaurants' },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.55)',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Dining column */}
          <div>
            <h4
              style={{
                color: 'white',
                fontFamily: "'Playfair Display', serif",
                fontSize: '0.9375rem',
                fontWeight: 600,
                marginBottom: '1rem',
                letterSpacing: '0.01em',
              }}
            >
              Quick Filters
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {[
                { href: '/restaurants', label: 'Open Now' },
                { href: '/restaurants', label: 'With Patio' },
                { href: '/restaurants', label: 'Kid-Friendly' },
                { href: '/restaurants', label: 'Wheelchair Access' },
              ].map((l) => (
                <li key={l.label}>
                  <Link
                    href="/restaurants"
                    style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.55)',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary-light)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About column */}
          <div>
            <h4
              style={{
                color: 'white',
                fontFamily: "'Playfair Display', serif",
                fontSize: '0.9375rem',
                fontWeight: 600,
                marginBottom: '1rem',
                letterSpacing: '0.01em',
              }}
            >
              About Paris
            </h4>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.5)' }}>
              Known as the &quot;Crystal City&quot; for its glass industry heritage, Paris sits at the confluence of the Grand and Nith Rivers in Brant County, Ontario.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '1.25rem 0',
        }}
      >
        <div
          className="container-xl"
          style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.35)' }}>
            © {currentYear} Paris, Ontario. Made with care for the community.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {[
                { Icon: Link2, label: 'Social' },
                { Icon: X, label: 'X / Twitter' },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.45)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--primary)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                  }}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
