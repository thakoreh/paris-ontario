import Link from 'next/link';
import { MapPin, Camera, Globe } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[var(--text)] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif text-xl text-white">Paris, Ontario</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              A charming riverside town on the Grand River, where heritage meets hospitality.
              Discover local dining, heritage sites, and natural beauty in one of Ontario&apos;s
              most picturesque small towns.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-serif text-lg mb-4 text-white">Explore</h4>
            <ul className="space-y-2">
              {[
                { href: '/', label: 'Home' },
                { href: '/restaurants', label: 'Restaurant Directory' },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-gray-400 hover:text-[var(--primary)] transition-colors text-sm">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-serif text-lg mb-4 text-white">Visit Paris</h4>
            <p className="text-gray-400 text-sm leading-relaxed">
              Located along the Grand River in Southwestern Ontario, Canada.
              Just 20 minutes from Brantford, 30 minutes from Kitchener-Waterloo.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-[var(--primary)] flex items-center justify-center transition-colors">
                <Camera className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-gray-800 hover:bg-[var(--primary)] flex items-center justify-center transition-colors">
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="section-divider !bg-gray-700 mt-12" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
          <p className="text-gray-500 text-sm">
            © 2025 Paris, Ontario. Community-powered restaurant guide.
          </p>
          <p className="text-gray-500 text-sm">
            Built with care for the Paris community
          </p>
        </div>
      </div>
    </footer>
  );
}
