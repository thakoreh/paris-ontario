import { notFound } from "next/navigation";
import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = blogPosts.filter((p) => p.id !== post.id).slice(0, 3);

  // Simple markdown-to-HTML conversion
  const contentHtml = post.content
    .split("\n\n")
    .map((para) => {
      if (para.startsWith("**") && para.endsWith("**")) {
        return `<h3 class="text-xl font-display font-bold mt-8 mb-4" style="color: var(--warm-brown)">${para.replace(/\*\*/g, "")}</h3>`;
      }
      if (para.startsWith("*") && para.endsWith("*")) {
        return `<p class="text-gray-500 italic mb-4">${para.replace(/\*/g, "")}</p>`;
      }
      return `<p class="text-gray-700 leading-relaxed mb-6">${para.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("");

  return (
    <main className="min-h-screen bg-[var(--warm-bg)]">
      {/* Hero */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 text-white max-w-4xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm mb-6 hover:text-[var(--gold)] transition-colors"
          >
            <ArrowLeft size={16} /> Back to Blog
          </Link>
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: "var(--gold)", color: "white" }}
              >
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-4 leading-tight">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-6 text-sm text-white/80">
            <span className="flex items-center gap-2">
              <User size={14} /> {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={14} />
              {new Date(post.date).toLocaleDateString("en-CA", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-2">
              <Clock size={14} /> {post.readTime}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <article
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Share */}
        <div className="mt-16 pt-8 border-t">
          <p className="font-semibold mb-4">Share this story</p>
          <div className="flex gap-4">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://parisontario.ca/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#1DA1F2] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Share on X
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://parisontario.ca/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#4267B2] text-white rounded-full text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Share on Facebook
            </a>
          </div>
        </div>

        {/* Related Posts */}
        <div className="mt-16">
          <h2 className="text-2xl font-display font-bold mb-8">More stories from Paris</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={`/blog/${related.slug}`}
                className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
              >
                <img
                  src={related.image}
                  alt={related.title}
                  className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-4">
                  <h3 className="font-display font-bold text-sm group-hover:text-[var(--burgundy)] transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
