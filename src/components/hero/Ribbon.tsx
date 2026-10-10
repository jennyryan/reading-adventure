/**
 * The cream ribbon banner with curved, hand-lettered title text. The
 * visible lettering is SVG text on a curved path, so screen readers get a
 * plain heading instead.
 */
export function Ribbon({ title = "Norah's Reading Adventure" }: { title?: string }) {
  return (
    <h1 className="w-full max-w-[760px]">
      <span className="sr-only">{title}</span>
      <svg viewBox="0 0 800 240" className="w-full drop-shadow-[0_6px_10px_rgba(63,42,77,0.25)]" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ribbon-face" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffaf0" />
            <stop offset="100%" stopColor="#f8ebcf" />
          </linearGradient>
          {/* The baseline the lettering follows, through the middle of the band. */}
          <path id="ribbon-text-path" d="M 96 166 Q 400 66 704 166" />
        </defs>

        {/* Folded tails behind the band */}
        <path d="M 128 150 L 18 168 L 52 204 L 22 238 L 140 226 Z" fill="#ecd9b3" />
        <path d="M 672 150 L 782 168 L 748 204 L 778 238 L 660 226 Z" fill="#ecd9b3" />
        {/* Little shadow folds where the tails tuck under */}
        <path d="M 96 176 L 140 226 L 140 186 Z" fill="#d9c08f" />
        <path d="M 704 176 L 660 226 L 660 186 Z" fill="#d9c08f" />

        {/* Main arched band */}
        <path
          d="M 80 128 Q 400 22 720 128 L 720 206 Q 400 104 80 206 Z"
          fill="url(#ribbon-face)"
          stroke="#e6cfa3"
          strokeWidth={3}
        />
        {/* Stitched edges */}
        <path d="M 92 140 Q 400 40 708 140" fill="none" stroke="#e3c79a" strokeWidth={2} strokeDasharray="6 7" />
        <path d="M 92 194 Q 400 92 708 194" fill="none" stroke="#e3c79a" strokeWidth={2} strokeDasharray="6 7" />

        <text
          fill="#c2417f"
          fontSize={42}
          style={{ fontFamily: "var(--font-script)" }}
          textAnchor="middle"
        >
          <textPath href="#ribbon-text-path" startOffset="50%">
            {title}
          </textPath>
        </text>
      </svg>
    </h1>
  );
}
