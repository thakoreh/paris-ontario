"use client";

import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";
import { Calendar, Clock, ArrowRight, Tag } from "lucide-react";

export default function BlogPage() {
  const featured = blogPosts[0];
  const rest = blogPosts.slice(1);

  return (
    <main className="min-h-screen bg-[var(--warm-bg)]">
      {/* Header */}
      <div
        className="relative py-24 px-6 text-center"
        style={{
          background: "linear-gradient(135deg, var(--warm-brown) 0%, var(--burgundy) 100%)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-sm font-semibold tracking-widest uppercase mb-4"
            style={{ color: "var(--gold)" }}
          >
            From the Blog
          </p>
          <h1 className="text-5xl font-display font-bold text-white mb-4">
            Stories from Paris
          </h1>
          <p className="text-xl text-white/80">
            History, hidden gems, food trails, and the stories that make Paris, Ontario unforgettable.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Featured Post */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-16">
          <div className="relative rounded-2xl overflow-hidden bg-white shadow-lg group-hover:shadow-xl transition-all duration-300">
            <div className="md:flex">
              <div className="md:w-1/2">
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: "var(--gold)", color: "white" }}
                  >
                    Featured
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar size={14} />
                    {new Date(featured.date).toLocaleDateString("en-CA", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-4 group-hover:text-[var(--burgundy)] transition-colors">
                  {featured.title}
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">{featured.excerpt}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {featured.readTime}
                  </span>
                  <span>By {featured.author}</span>
                </div>
                <div className="flex items-center gap-2 font-semibold" style={{ color: "var(--burgundy)" }}>
                  Read the full story <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Other Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 flex flex-col"
            >
              <div className="relative overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-semibold px-2 py-1 rounded-full bg-white/90 text-gray-700"
                    >
                      {tag.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Calendar size={14} />
                  {new Date(post.date).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  <span className="mx-1">·</span>
                  <Clock size={14} />
                  {post.readTime}
                </div>
                <h3 className="text-lg font-display font-bold mb-3 group-hover:text-[var(--burgundy)] transition-colors flex-1">
                  {post.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                <div
                  className="flex items-center gap-1 text-sm font-semibold mt-auto pt-4 border-t"
                  style={{ color: "var(--burgundy)" }}
                >
                  Read more <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
