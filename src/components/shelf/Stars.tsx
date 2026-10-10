const STAR_PATH =
  "M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3 1.1-6.5L2.6 9.3l6.5-.9L12 2.5z";

/** Read-only star rating. The tappable version arrives with the add modal. */
export function Stars({ rating, size = 22 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d={STAR_PATH}
            fill={n <= rating ? "var(--color-star)" : "#ffffff"}
            stroke={n <= rating ? "#d99a00" : "#cdbbd9"}
            strokeWidth={1.4}
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}
