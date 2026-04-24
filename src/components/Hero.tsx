'use client';

import Link from 'next/link';
import { ArrowDown, UtensilsCrossed, Compass } from 'lucide-react';

export default function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ minHeight: '100svh' }}
    >
      {/* Background — Grand River aerial */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=2000&q=90)',
          transition: 'transform 8s ease-out',
        }}
      />

      {/* Layered overlays */}
      <div className="absolute inset-0 hero-overlay" />
      <div className="absolute inset-0 dot-pattern opacity-20" />

      {/* Bottom fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40"
        style={{
          background:
            'linear-gradient(to top, var(--warm-bg), transparent)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white max-w-5xl mx-auto px-4 sm:px-6">
        {/* Eyebrow badge */}
        <div
          className="inline-flex items-center gap-2 mb-8 animate-fade-in-up"
          style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '100px',
            padding: '8px 18px',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-[var(--success)] inline-block"
            style={{ boxShadow: '0 0 6px var(--success)' }}
          />
          <span className="text-sm font-medium text-white/90 tracking-wide">
            Grand River Valley, Ontario
          </span>
        </div>

        {/* Headline */}
        <h1
          className="font-serif mb-6 animate-fade-in-up"
          style={{
            fontSize: 'clamp(3rem, 8vw, 6.5rem)',
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            animationDelay: '100ms',
          }}
        >
          Paris, Ontario
        </h1>

        {/* Subheadline */}
        <p
          className="text-lg sm:text-xl md:text-2xl text-white/80 font-light leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-in-up"
          style={{ animationDelay: '220ms', fontWeight: 300 }}
        >
          Where the Grand River flows past century-old limestone,
          <br className="hide-mobile" />
          and every meal feels like a occasion.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
          style={{ animationDelay: '340ms' }}
        >
          <Link href="/restaurants" className="btn-primary text-base py-3.5 px-8 shadow-lg w-full sm:w-auto justify-center">
            <UtensilsCrossed className="w-5 h-5" />
            Explore Restaurants
          </Link>
          <a
            href="#discover"
            className="btn-ghost text-base py-3.5 px-8 w-full sm:w-auto justify-center"
          >
            <Compass className="w-5 h-5" />
            Discover the Town
          </a>
        </div>

        {/* Quick stats */}
        <div
          className="flex items-center justify-center gap-8 mt-12 animate-fade-in-up"
          style={{ animationDelay: '460ms' }}
        >
          {[
            { value: '15+', label: 'Restaurants' },
            { value: '8,700', label: 'Residents' },
            { value: '1840s', label: 'Heritage Town' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="font-serif text-2xl text-white font-semibold"
                style={{ letterSpacing: '-0.02em' }}
              >
                {stat.value}
              </div>
              <div className="text-white/55 text-xs font-medium tracking-wide uppercase mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <a
        href="#discover"
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 animate-float"
        style={{
          animation: 'scrollBounce 2s ease-in-out infinite',
          animationDelay: '800ms',
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        >
          <ArrowDown className="w-5 h-5 text-white/80" />
        </div>
      </a>
    </section>
  );
}
