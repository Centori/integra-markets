"use client"

export default function IntegraAppIcon({ size = 1024 }: { size?: number }) {
  const iconSize = size
  const borderWidth = Math.max(4, size * 0.02) // Responsive border width
  const dotSize = size * 0.08 // 8% of total size
  const lineWidth = size * 0.08 // 8% of total size
  const lineHeight = size * 0.25 // 25% of total size
  const cornerRadius = size * 0.15 // 15% for rounded corners

  return (
    <div
      className="bg-black flex items-center justify-center"
      style={{
        width: iconSize,
        height: iconSize,
        borderRadius: cornerRadius,
      }}
    >
      {/* Rounded Square Container */}
      <div
        className="border-white flex flex-col items-center justify-center"
        style={{
          width: iconSize * 0.75,
          height: iconSize * 0.75,
          borderWidth: borderWidth,
          borderRadius: cornerRadius * 0.8,
        }}
      >
        {/* Dot */}
        <div
          className="bg-white rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            marginBottom: size * 0.06,
          }}
        />
        {/* Line */}
        <div
          className="bg-white rounded-full"
          style={{
            width: lineWidth,
            height: lineHeight,
          }}
        />
      </div>
    </div>
  )
}
