import React from "react";

// ---- シマーキーフレームをDOMに一度だけ注入 ----
const skeletonKeyframes = `
@keyframes cx-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}`;
if (typeof document !== "undefined" && !document.getElementById("cx-skeleton-style")) {
  const s = document.createElement("style");
  s.id = "cx-skeleton-style";
  s.textContent = skeletonKeyframes;
  document.head.appendChild(s);
}

// ---- SkeletonBar ----
export function SkeletonBar({
  width = "80%",
  height = 16,
  radius = 6,
}: {
  width?: string | number;
  height?: number;
  radius?: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(15,23,42,.08) 25%, rgba(15,23,42,.18) 50%, rgba(15,23,42,.08) 75%)",
        backgroundSize: "800px 100%",
        animation: "cx-shimmer 1.4s infinite linear",
      }}
    />
  );
}

// ---- SkeletonCard ----
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card" style={{ padding: 18, background: "#fff" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ marginBottom: i < rows - 1 ? 12 : 0 }}>
          <SkeletonBar
            width={i === 0 ? "40%" : i % 2 === 0 ? "70%" : "55%"}
            height={i === 0 ? 14 : 12}
          />
        </div>
      ))}
    </div>
  );
}
