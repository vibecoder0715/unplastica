export function DottedSpinner({ size = 52 }: { size?: number }) {
  const dots = [
    { cx: 32, cy: 8, opacity: 1.0 },
    { cx: 44, cy: 11.2, opacity: 0.92 },
    { cx: 52.8, cy: 20, opacity: 0.83 },
    { cx: 56, cy: 32, opacity: 0.75 },
    { cx: 52.8, cy: 44, opacity: 0.67 },
    { cx: 44, cy: 52.8, opacity: 0.58 },
    { cx: 32, cy: 56, opacity: 0.50 },
    { cx: 20, cy: 52.8, opacity: 0.42 },
    { cx: 11.2, cy: 44, opacity: 0.33 },
    { cx: 8, cy: 32, opacity: 0.25 },
    { cx: 11.2, cy: 20, opacity: 0.17 },
    { cx: 20, cy: 11.2, opacity: 0.08 },
  ];
  return (
    <svg
      className="dotted-loading-spinner"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-label="Loading"
      role="progressbar"
      style={{ overflow: "visible" }}
    >
      <g className="dotted-spinner-group">
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.cx} cy={dot.cy} r={3.8} fill="currentColor" opacity={dot.opacity} />
        ))}
      </g>
    </svg>
  );
}
export default DottedSpinner;
