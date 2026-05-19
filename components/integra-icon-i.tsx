// Integra Markets Icon - "i" letter on emerald green background
// Adapted from Kalshi's "K" icon design

export const IntegraIconI = ({ size = 512 }: { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Emerald green background */}
      <rect width="512" height="512" fill="#4ECCA3" />

      {/* White "i" letter */}
      <g>
        {/* Vertical stem */}
        <rect x="225" y="120" width="62" height="280" fill="white" rx="8" />
        
        {/* Dot on top */}
        <circle cx="256" cy="80" r="35" fill="white" />
      </g>
    </svg>
  );
};

// Icon with transparent background
export const IntegraIconITransparent = ({ size = 512 }: { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* White "i" letter on transparent background */}
      <g>
        {/* Vertical stem */}
        <rect x="225" y="120" width="62" height="280" fill="white" rx="8" />
        
        {/* Dot on top */}
        <circle cx="256" cy="80" r="35" fill="white" />
      </g>
    </svg>
  );
};
