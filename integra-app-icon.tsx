"use client"

export default function IntegraAppIcon({ size = 1024 }: { size?: number }) {
  const iconSize = size
  const borderWidth = Math.max(2, size * 0.015) // Responsive border width
  const dotSize = size * 0.06 // 6% of total size for slim design
  const lineWidth = size * 0.06 // 6% of total size for slim design
  const lineHeight = size * 0.2 // 20% of total size
  const cornerRadius = size * 0.1 // 10% for more square appearance
  const gapSize = size * 0.04 // Gap between dot and line

  return (
    <div
      className="bg-black flex items-center justify-center"
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: cornerRadius,
      }}
    >
      {/* Square Container with green border */}
      <div
        className="border-emerald-500 flex flex-col items-center justify-center"
        style={{
          width: iconSize * 0.7,
          height: iconSize * 0.7,
          borderWidth: borderWidth,
          borderRadius: cornerRadius * 0.75,
        }}
      >
        {/* Square Dot - green */}
        <div
          className="bg-emerald-500"
          style={{
            width: dotSize,
            height: dotSize,
            marginBottom: gapSize,
            borderRadius: cornerRadius * 0.1,
          }}
        />
        {/* Rectangular Line - green */}
        <div
          className="bg-emerald-500"
          style={{
            width: lineWidth,
            height: lineHeight,
            borderRadius: cornerRadius * 0.1,
          }}
        />
      </div>
    </div>
  )
}
