import Link from 'next/link';
import { ArrowRight, Users, Droplets, Landmark, Star } from 'lucide-react';
import Hero from '@/components/Hero';
import RestaurantCard from '@/components/RestaurantCard';
import { restaurants } from '@/data/restaurants';

export default function HomePage() {
  const featured = restaurants.slice(0, 6);

  const stats = [
    { icon: Users, value: '8,700', label: 'Friendly Residents' },
    { icon: Droplets, value: '280km', label: 'Grand River Flow' },
    { icon: Landmark, value: '150+', label: 'Heritage Buildings' },
  ];

  return (
    <>
      {/* Hero */}
      <Hero />

      {/* About strip */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="inline-flex items-center gap-2 text-[var(--primary)] text-sm font-semibold uppercase tracking-wider mb-4">
              <Star className="w-4 h-4 fill-current" />
              Welcome to Paris
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl text-[var(--text)] mb-6">
              Where the Grand River<br />meets small-town charm
            </h2>
            <p className="text-[var(--text-muted)] text-lg leading-relaxed">
              Paris, Ontario sits at the confluence of the Grand and Nith Rivers. Known as
              the &quot;Crystal City&quot; for its once-thriving glass industry, today it&apos;s a
              peaceful retreat with century-old limestone buildings, riverside trails, and
              a food scene that punches well above its weight.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {stats.map(({ icon: Icon, value, label }, i) => (
              <div
                key={label}
                className="bg-[var(--bg)] rounded-2xl p-8 text-center border border-[var(--border)] animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary-light)] mb-4">
                  <Icon className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div className="font-serif text-4xl text-[var(--text)] mb-1">{value}</div>
                <div className="text-[var(--text-muted)] text-sm font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="section-divider" /></div>

      {/* Featured Restaurants */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <span className="text-[var(--primary)] text-sm font-semibold uppercase tracking-wider">
                Local Favourites
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl text-[var(--text)] mt-2">
                Featured Restaurants
              </h2>
            </div>
            <Link
              href="/restaurants"
              className="btn-secondary hidden sm:inline-flex"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((r, i) => (
              <div
                key={r.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <RestaurantCard restaurant={r} />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link href="/restaurants" className="btn-primary">
              View All Restaurants
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* River photo section */}
      <section className="relative py-24 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1800&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-[var(--text)]/60" />
        <div className="relative z-10 max-w-4xl mx-auto text-center text-white px-4">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl mb-6">
            The Grand River flows<br />through it all
          </h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
            From morning coffee overlooking the water to sunset dinners on the patio,
            Paris&apos;s riverside location shapes everything — the pace, the people,
            and the plates.
          </p>
          <Link href="/restaurants" className="btn-primary text-base py-3.5 px-8">
            <ArrowRight className="w-5 h-5" />
            Find Your Riverside Favourite
          </Link>
        </div>
      </section>

      {/* Directory CTA */}
      <section className="py-20 bg-[var(--primary-light)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="font-serif text-4xl sm:text-5xl text-[var(--text)] mb-4">
                Explore the full<br />dining directory
              </h2>
              <p className="text-[var(--text-muted)] text-lg leading-relaxed mb-6 max-w-lg">
                Filter by what matters to you — open now, WiFi, wheelchair access,
                patio seating, or kid-friendly. Discover 15 local favourites with
                community upvotes to guide your choice.
              </p>
              <Link href="/restaurants" className="btn-primary text-base py-3.5 px-8">
                Browse the Directory
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex-1 max-w-md">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-[var(--border)]">
                {[
                  { label: 'Open Now', color: 'bg-green-100 text-green-700' },
                  { label: 'Has WiFi', color: 'bg-blue-100 text-blue-700' },
                  { label: 'Wheelchair Access', color: 'bg-purple-100 text-purple-700' },
                  { label: 'Patio Seating', color: 'bg-green-100 text-green-700' },
                  { label: 'Kid-Friendly', color: 'bg-yellow-100 text-yellow-700' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-3 py-2.5 border-b border-[var(--border)] last:border-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${color.replace('100', '500').replace('bg-', 'bg-')}`} />
                    <span className="text-sm font-medium text-[var(--text)]">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
