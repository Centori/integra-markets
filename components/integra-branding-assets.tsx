// Integra Markets Branding Assets
// Adapted from Kalshi design patterns

export const IntegraBrandingText = () => {
  return (
    <svg
      width="1000"
      height="300"
      viewBox="0 0 1000 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Black background */}
      <rect width="1000" height="300" fill="#000000" />

      {/* "integra" text in emerald green */}
      <text
        x="500"
        y="200"
        fontSize="180"
        fontWeight="700"
        fill="#4ECCA3"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-5"
      >
        integra
      </text>
    </svg>
  );
};

export const IntegraBrandingTextWhite = () => {
  return (
    <svg
      width="1000"
      height="300"
      viewBox="0 0 1000 300"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Black background */}
      <rect width="1000" height="300" fill="#000000" />

      {/* "integra" text in white */}
      <text
        x="500"
        y="200"
        fontSize="180"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-5"
      >
        integra
      </text>
    </svg>
  );
};

// Modern variant with pixelated accent elements
export const IntegraBrandingModern = () => {
  return (
    <svg
      width="1200"
      height="600"
      viewBox="0 0 1200 600"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gray background */}
      <rect width="1200" height="600" fill="#A0A0A0" />

      {/* Pixelated coral/salmon accents (top right) */}
      <g fill="#FF9999">
        <rect x="100" y="50" width="60" height="60" />
        <rect x="180" y="50" width="60" height="60" />
        <rect x="100" y="130" width="60" height="60" />
        <rect x="180" y="130" width="60" height="60" />
        <rect x="260" y="50" width="60" height="60" />
      </g>

      {/* "integra" text in black */}
      <text
        x="600"
        y="380"
        fontSize="200"
        fontWeight="700"
        fill="black"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-8"
      >
        integra
      </text>

      {/* Pixelated accents (bottom right) */}
      <g fill="#FF9999">
        <rect x="1000" y="450" width="60" height="60" />
        <rect x="1080" y="450" width="60" height="60" />
        <rect x="1000" y="530" width="60" height="60" />
      </g>
    </svg>
  );
};

// Minimal variant
export const IntegraBrandingMinimal = () => {
  return (
    <svg
      width="1000"
      height="250"
      viewBox="0 0 1000 250"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Black background */}
      <rect width="1000" height="250" fill="#000000" />

      {/* "integra" text - clean and simple */}
      <text
        x="500"
        y="170"
        fontSize="150"
        fontWeight="600"
        fill="white"
        textAnchor="middle"
        fontFamily="-apple-system, system-ui, sans-serif"
        letterSpacing="2"
      >
        integra
      </text>
    </svg>
  );
};
