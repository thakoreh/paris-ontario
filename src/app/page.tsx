'use client';

import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  Clock,
  Wifi,
  Accessibility,
  Trees,
  Baby,
  Star,
  Heart,
  ChevronRight,
  Waves,
  Landmark,
  UtensilsCrossed,
} from 'lucide-react';
import Hero from "@/components/Hero";
import RestaurantCard from "@/components/RestaurantCard";
import { ParisTrivia } from "@/components/ParisTrivia";
import { restaurants } from '@/data/restaurants';

export default function HomePage() {
  const featured = restaurants.slice(0, 6);
  const top3 = restaurants.slice(0, 3);

  return (
    <>
      <Hero />

      {/* ── Discover Section ────────────────────────────────────── */}
      <section
        id="discover"
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 0',
          background: 'var(--warm-bg)',
        }}
      >
        <div className="container-xl">
          {/* Section label */}
          <div
            className="animate-fade-in-up"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '1.5rem',
              color: 'var(--primary)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            <Landmark style={{ width: '14px', height: '14px' }} />
            About the Town
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '3rem',
            }}
          >
            {/* Left: text */}
            <div>
              <h2
                className="animate-fade-in-up"
                style={{
                  fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  marginBottom: '1.5rem',
                  maxWidth: '14ch',
                }}
              >
                A riverside gem with a story in every stone
              </h2>
              <p
                className="animate-fade-in-up delay-100"
                style={{
                  fontSize: '1.0625rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.75,
                  maxWidth: '52ch',
                  marginBottom: '2rem',
                }}
              >
                Paris, Ontario sits at the confluence of the Grand and Nith Rivers. Known as the
                &quot;Crystal City&quot; for its once-thriving glass industry, today it&apos;s a peaceful
                retreat where century-old limestone buildings line cobblestone streets, riverside
                trails invite quiet walks, and the food scene punches well above its weight.
              </p>

              {/* Quick facts */}
              <div
                className="animate-fade-in-up delay-200"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2.5rem',
                }}
              >
                {[
                  { icon: MapPin, value: '8,700', label: 'Residents' },
                  { icon: Waves, value: '280km', label: 'Grand River' },
                  { icon: Landmark, value: '150+', label: 'Heritage Buildings' },
                  { icon: Star, value: '1840s', label: 'Founded' },
                ].map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    style={{
                      background: 'var(--warm-surface)',
                      border: '1px solid var(--warm-border)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <Icon style={{ width: '18px', height: '18px', color: 'var(--primary)' }} />
                    <span
                      className="font-serif"
                      style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}
                    >
                      {value}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/restaurants" className="btn-primary">
                Explore the Restaurants
                <ArrowRight style={{ width: '16px', height: '16px' }} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-xl"><div className="section-divider" /></div>

      {/* ── Top 3 Editorial Spotlight ───────────────────────────── */}
      <section style={{ padding: 'clamp(4rem, 8vw, 7rem) 0', background: 'var(--warm-bg)' }}>
        <div className="container-xl">
          {/* Section header */}
          <div
            className="animate-fade-in-up"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '3rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.625rem',
                }}
              >
                <Heart style={{ width: '13px', height: '13px', fill: 'currentColor' }} />
                Community Favourites
              </span>
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                The most loved by locals
              </h2>
            </div>
            <Link
              href="/restaurants"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                transition: 'gap 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.gap = '10px')}
              onMouseLeave={(e) => (e.currentTarget.style.gap = '6px')}
            >
              View all restaurants
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </Link>
          </div>

          {/* 3-column editorial grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}
            className="home-restaurant-grid"
          >
            {top3.map((r, i) => (
              <div
                key={r.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <RestaurantCard restaurant={r} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Full-Width River Photo ───────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          padding: 'clamp(5rem, 10vw, 9rem) 0',
          overflow: 'hidden',
        }}
      >
        {/* Background image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(135deg, rgba(6,94,87,0.78) 0%, rgba(13,148,136,0.50) 50%, rgba(0,0,0,0.3) 100%)',
          }}
        />
        <div className="container-xl" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div
            className="animate-fade-in-up"
            style={{ maxWidth: '700px', margin: '0 auto' }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '1.25rem',
              }}
            >
              <Waves style={{ width: '14px', height: '14px' }} />
              The Grand River
            </div>
            <h2
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.75rem)',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                marginBottom: '1.25rem',
              }}
            >
              The river shapes everything here
            </h2>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.75,
                marginBottom: '2.5rem',
                fontWeight: 300,
              }}
            >
              From morning coffee overlooking the water to sunset dinners on the patio, the Grand
              River sets the pace, the people, and the plates that make Paris so special.
            </p>
            <Link
              href="/restaurants"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: 'white',
                color: 'var(--primary-dark)',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '14px 28px',
                borderRadius: '12px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Find Riverside Dining
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Filters Showcase ─────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(4rem, 8vw, 6rem) 0',
          background: 'var(--primary)',
        }}
      >
        <div className="container-xl">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            {[
              {
                icon: Clock,
                label: 'Open Now',
                desc: 'See who\'s serving right now',
              },
              {
                icon: Wifi,
                label: 'Free WiFi',
                desc: 'Work or browse while you dine',
              },
              {
                icon: Accessibility,
                label: 'Wheelchair Access',
                desc: 'Fully accessible venues',
              },
              {
                icon: Trees,
                label: 'Patio Seating',
                desc: 'Riverside and garden patios',
              },
              {
                icon: Baby,
                label: 'Kid-Friendly',
                desc: 'Great for the whole family',
              },
            ].map(({ icon: Icon, label, desc }, i) => (
              <div
                key={label}
                className="animate-fade-in-up"
                style={{
                  animationDelay: `${i * 80}ms`,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  color: 'white',
                  transition: 'background 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
                }
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.875rem',
                  }}
                >
                  <Icon style={{ width: '20px', height: '20px' }} />
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.5,
                  }}
                >
                  {desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── All Restaurants Grid ─────────────────────────────────── */}
      <section style={{ padding: 'clamp(4rem, 8vw, 7rem) 0', background: 'var(--warm-bg)' }}>
        <div className="container-xl">
          <div
            className="animate-fade-in-up"
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: '3rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--primary)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '0.625rem',
                }}
              >
                <UtensilsCrossed style={{ width: '13px', height: '13px' }} />
                Full Directory
              </span>
              <h2
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                }}
              >
                All {restaurants.length} local favourites
              </h2>
            </div>
            <Link
              href="/restaurants"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--primary)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                transition: 'gap 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.gap = '10px')}
              onMouseLeave={(e) => (e.currentTarget.style.gap = '6px')}
            >
              Browse with filters
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {featured.map((r, i) => (
              <div
                key={r.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <RestaurantCard restaurant={r} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section
        style={{
          padding: 'clamp(5rem, 10vw, 8rem) 0',
          background: 'var(--warm-bg)',
          borderTop: '1px solid var(--warm-border)',
        }}
      >
        <div className="container-xl" style={{ textAlign: 'center' }}>
          <div
            className="animate-fade-in-up"
            style={{ maxWidth: '600px', margin: '0 auto' }}
          >
            <h2
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                marginBottom: '1.25rem',
              }}
            >
              Ready to discover Paris?
            </h2>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'var(--text-muted)',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
              }}
            >
              Filter by what matters to you — open now, WiFi, wheelchair access,
              patio seating, or kid-friendly. Discover {restaurants.length} local favourites
              with community upvotes to guide your choice.
            </p>
            <Link href="/restaurants" className="btn-primary text-base py-4 px-10">
              Open Restaurant Directory
              <ArrowRight style={{ width: '18px', height: '18px' }} />
            </Link>
          </div>
        </div>
      </section>

      <ParisTrivia />
    </>
  );
}
