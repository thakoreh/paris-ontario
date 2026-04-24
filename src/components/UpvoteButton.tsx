'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

interface Props {
  restaurantId: string;
  initialUpvotes: number;
}

export default function UpvoteButton({ restaurantId, initialUpvotes }: Props) {
  const [voted, setVoted] = useState(false);
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`upvoted:${restaurantId}`);
    if (stored === 'true') {
      setVoted(true);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, [restaurantId]);

  const toggle = () => {
    const newVoted = !voted;
    setVoted(newVoted);
    setUpvotes((prev) => (newVoted ? prev + 1 : prev - 1));
    if (newVoted) {
      localStorage.setItem(`upvoted:${restaurantId}`, 'true');
    } else {
      localStorage.removeItem(`upvoted:${restaurantId}`);
    }
  };

  if (!mounted) {
    return (
      <button className="upvote-btn">
        <Heart className="w-4 h-4" />
        <span>{initialUpvotes}</span>
      </button>
    );
  }

  return (
    <button
      className={`upvote-btn ${voted ? 'voted' : ''}`}
      onClick={toggle}
      aria-label={voted ? 'Remove upvote' : 'Upvote this restaurant'}
    >
      <Heart className={`w-4 h-4 ${voted ? 'fill-current' : ''}`} />
      <span>{upvotes}</span>
    </button>
  );
}
