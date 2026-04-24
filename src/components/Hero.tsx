'use client';

import Link from 'next/link';
import { ArrowDown, Utensils, MapPin } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1800&q=85)',
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 hero-overlay" />

      {/* Subtle dot texture */}
      <div className="absolute inset-0 dot-pattern opacity-30" />

      {/* Content */}
      <div className="relative z-10 text-center text-white max-w-4xl mx-auto px-4 sm:px-6">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-8 animate-fade-in"
          style={{ animationDelay: '0ms' }}
        >
          <MapPin className="w-4 h-4 text-[var(--primary-light)]" />
          <span className="text-sm font-medium text-white/90">Grand River Valley, Ontario</span>
        </div>

        {/* Headline */}
        <h1
          className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white leading-tight mb-6 animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        >
          Paris, Ontario
        </h1>

        <p
          className="text-lg sm:text-xl md:text-2xl text-white/85 font-light leading-relaxed max-w-2xl mx-auto mb-10 animate-fade-in-up"
          style={{ animationDelay: '200ms' }}
        >
          A riverside gem where heritage stone meets the flowing Grand River.
          Discover local restaurants, charming shops, and peaceful riverside walks.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <Link href="/restaurants" className="btn-primary text-base py-3.5 px-8 shadow-lg">
            <Utensils className="w-5 h-5" />
            Explore Restaurants
          </Link>
          <a href="#about" className="btn-secondary !border-white/40 !text-white hover:!bg-white/10 text-base py-3.5 px-8">
            Learn More
          </a>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float"
          style={{ animationDelay: '600ms' }}
        >
          <a href="#about" aria-label="Scroll down">
            <ArrowDown className="w-6 h-6 text-white/60" />
          </a>
        </div>
      </div>
    </section>
  );
}
