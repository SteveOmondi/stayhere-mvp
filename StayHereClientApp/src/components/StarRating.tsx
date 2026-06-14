import { useState } from "react";
import { IcoStar, IcoStarFilled } from "./icons";

export function StarRating({
  value = 0,
  size = 16,
  className = "",
}: {
  value?: number;
  size?: number;
  className?: string;
}) {
  const full = Math.round(value);
  return (
    <div className={`flex items-center gap-0.5 text-brand-gold ${className}`}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= full ? (
          <IcoStarFilled key={i} size={size} />
        ) : (
          <IcoStar key={i} size={size} className="text-white/25" />
        )
      )}
    </div>
  );
}

export function InteractiveStars({
  value = 0,
  onRate,
  size = 26,
}: {
  value?: number;
  onRate: (rating: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || Math.round(value);
  return (
    <div className="flex items-center gap-1 text-brand-gold">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onRate(i)}
          className="transition-transform hover:scale-125"
          aria-label={`Rate ${i} stars`}
        >
          {i <= active ? (
            <IcoStarFilled size={size} />
          ) : (
            <IcoStar size={size} className="text-white/25" />
          )}
        </button>
      ))}
    </div>
  );
}
