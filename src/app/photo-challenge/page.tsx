"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Camera, MapPin, CheckCircle2, ArrowLeft } from "lucide-react";

const PHOTO_SPOTS = [
  {
    id: "cobblestone-corner",
    name: "The Cobblestone Corner",
    location: "King & William St Intersection",
    tip: "Arrive at 7:30am for empty streets and soft morning light. The golden stones glow beautifully in early light.",
    bestTime: "7:30am - 9am",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "grand-river-bridge",
    name: "Grand River Bridge",
    location: "N Main St Bridge",
    tip: "The iron railings with morning mist create a magical atmosphere. Use a wide aperture to blur the mist.",
    bestTime: "Sunrise (6:15am)",
    img: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "covered-bridge",
    name: "The Covered Bridge",
    location: "County Road 18, 8km north",
    tip: "The wooden structure glows amber at sunrise. Best angle is from the southeast embankment.",
    bestTime: "Sunrise",
    img: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
    difficulty: "Moderate",
  },
  {
    id: "mural-district",
    name: "The Mural District",
    location: "15 Thames Rd S (old railway station)",
    tip: "Best photographed on overcast days to avoid harsh shadows. Murals change annually.",
    bestTime: "10am or cloudy day",
    img: "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "copper-dome",
    name: "St. James Anglican Church",
    location: "48 William St N",
    tip: "The teal-green copper dome is framed by oak trees. Shoot from the south side looking up.",
    bestTime: "10am or 4pm",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "bookshop-window",
    name: "Paris Nesting & Co",
    location: "42 William St",
    tip: "The seasonal window display changes throughout the year. Best shot from across the street to avoid glare.",
    bestTime: "11am",
    img: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "trail-entrance",
    name: "Grand River Trail Bridge",
    location: "Grand River Trail, km 2",
    tip: "The wooden footbridge creates perfect leading lines. Spring wildflowers frame the entry in May-June.",
    bestTime: "7am (spring)",
    img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "farm-gate",
    name: "The Farm Gate",
    location: "Blue Lake Road",
    tip: "Weathered wooden gate with rolling fields behind. Photograph from the road shoulder — it's private property.",
    bestTime: "5pm (golden hour)",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "market-squares",
    name: "Market Square Sculptures",
    location: "Market Square, King St",
    tip: "The bronze children-playing sculptures are silhouetted beautifully against a sunset sky.",
    bestTime: "Sunset",
    img: "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800&q=80",
    difficulty: "Easy",
  },
  {
    id: "floral-arch",
    name: "The Floral Arch",
    location: "42 William St (private residence)",
    tip: "Climbing roses reach peak bloom in late May and early June. The owner sometimes provides a step stool for the perfect angle.",
    bestTime: "8am, May-June",
    img: "https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=800&q=80",
    difficulty: "Easy",
  },
];

export default function PhotoChallengePage() {
  const [visited, setVisited] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("paris-photo-challenge");
      if (saved) setVisited(JSON.parse(saved));
    } catch {}
  }, []);

  const toggle = (id: string) => {
    const next = visited.includes(id)
      ? visited.filter((v) => v !== id)
      : [...visited, id];
    setVisited(next);
    try {
      localStorage.setItem("paris-photo-challenge", JSON.stringify(next));
    } catch {}
  };

  const displayed = showAll ? PHOTO_SPOTS : PHOTO_SPOTS.slice(0, 6);

  return (
    <main className="min-h-screen" style={{ background: "var(--warm-bg)" }}>
      {/* Header */}
      <div
        className="relative py-20 px-6 text-center"
        style={{
          background: "linear-gradient(135deg, var(--warm-brown) 0%, var(--burgundy) 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm mb-6 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6">
            <Camera size={32} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Paris Photo Challenge
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            10 Instagram-worthy spots in Paris, Ontario. Visit them all and capture the town&apos;s hidden beauty.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 bg-white/20 rounded-full px-6 py-3">
            <span className="text-white font-bold text-2xl">{visited.length}</span>
            <span className="text-white/80 text-sm">/ {PHOTO_SPOTS.length} spots visited</span>
            <div className="w-32 h-2 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(visited.length / PHOTO_SPOTS.length) * 100}%`,
                  background: "var(--gold)",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Progress banner */}
      {visited.length === PHOTO_SPOTS.length && (
        <div
          className="mx-6 mt-6 rounded-2xl p-6 text-center"
          style={{ background: "var(--gold)" }}
        >
          <p className="text-2xl font-display font-bold text-black mb-2">
            🏆 You completed the Paris Photo Challenge!
          </p>
          <p className="text-black/70">
            You&apos;re officially a Paris, Ontario photography expert.
          </p>
        </div>
      )}

      {/* Spots Grid */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayed.map((spot) => {
            const isVisited = visited.includes(spot.id);
            return (
              <div
                key={spot.id}
                className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                  isVisited ? "ring-4 ring-[var(--success)] ring-offset-2" : "shadow-lg"
                }`}
                style={{ background: "white" }}
              >
                {/* Image */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={spot.img}
                    alt={spot.name}
                    className="w-full h-full object-cover"
                  />
                  {isVisited && (
                    <div className="absolute top-3 right-3">
                      <div
                        className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold text-white"
                        style={{ background: "var(--success)" }}
                      >
                        <CheckCircle2 size={14} /> Visited
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3">
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-full text-white"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      {spot.bestTime}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-display font-bold text-lg mb-2">{spot.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                    <MapPin size={14} />
                    {spot.location}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{spot.tip}</p>

                  <button
                    onClick={() => toggle(spot.id)}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                      isVisited
                        ? "bg-[var(--success)]/10 text-[var(--success)] border-2 border-[var(--success)]"
                        : "bg-[var(--warm-brown)] text-white hover:opacity-90"
                    }`}
                  >
                    {isVisited ? "✓ Visited — Mark as Not Visited" : "📍 Mark as Visited"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show More */}
        {!showAll && PHOTO_SPOTS.length > 6 && (
          <div className="text-center mt-12">
            <button
              onClick={() => setShowAll(true)}
              className="px-8 py-3 rounded-full font-semibold text-[var(--warm-brown)] border-2 border-[var(--warm-brown)] hover:bg-[var(--warm-brown)] hover:text-white transition-all"
            >
              See All {PHOTO_SPOTS.length} Spots
            </button>
          </div>
        )}
      </div>

      {/* Share */}
      <div className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <p className="text-gray-500 mb-4">
          Complete the challenge and share your photos with <strong>#ParisOntario</strong>
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Share on Instagram
          </a>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors"
          >
            Explore More of Paris
          </Link>
        </div>
      </div>
    </main>
  );
}
