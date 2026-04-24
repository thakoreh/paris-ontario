'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';

interface Props {
  restaurantId: string;
  initialUpvotes: number;
  compact?: boolean;
}

export default function UpvoteButton({ restaurantId: _id, initialUpvotes, compact }: Props) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [voted, setVoted] = useState(false);

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (voted) {
      setUpvotes((n) => n - 1);
      setVoted(false);
    } else {
      setUpvotes((n) => n + 1);
      setVoted(true);
    }
  };

  return (
    <button
      className={`upvote-btn ${voted ? 'voted' : ''}`}
      onClick={handleVote}
      aria-label={voted ? 'Remove upvote' : 'Upvote this restaurant'}
      style={compact ? { padding: '5px 10px', fontSize: '0.75rem', gap: '4px' } : {}}
    >
      <Heart
        className={voted ? 'fill-current' : ''}
        style={{
          width: compact ? '12px' : '14px',
          height: compact ? '12px' : '14px',
          transition: 'transform 0.15s ease',
          transform: voted ? 'scale(1.15)' : 'scale(1)',
        }}
      />
      <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {upvotes.toLocaleString()}
      </span>
    </button>
  );
}
