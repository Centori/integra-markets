# Integra Markets Badge & Notification Assets

## Directory Structure

```
badges/
├── README.md                 # This file
├── badge-config.json        # Configuration for all badge types and sizes
├── icons/                   # Generated notification icons
│   ├── android/            # Android-specific notification icons
│   ├── ios/                # iOS-specific notification icons
│   └── web/                # Web notification icons
└── generated/              # Auto-generated badge assets
```

## Badge Types

### Notification Badge
- **Color**: #4ECCA3 (Emerald accent)
- **Usage**: Standard push notifications
- **Sizes**: 16px, 24px, 32px, 48px

### Alert Badge
- **Color**: #F05454 (Red/Bearish)
- **Usage**: Critical alerts, warnings
- **Sizes**: 16px, 24px, 32px, 48px

### Market Badge
- **Color**: #30A5FF (Blue)
- **Usage**: Market updates, news
- **Sizes**: 16px, 24px, 32px, 48px

### Success Badge
- **Color**: #4ECCA3 (Bullish green)
- **Usage**: Positive updates, confirmations
- **Sizes**: 16px, 24px, 32px, 48px

### Bearish Badge
- **Color**: #F05454 (Red)
- **Usage**: Negative market movements
- **Sizes**: 16px, 24px, 32px, 48px

## Notification Icon Variants

### Default Icon
- Standard notification icon with border
- Used for: iOS app notifications, large Android notifications
- Based on Integra's "i" logo design

### Simplified Icon
- Minimalist version without border
- Used for: Small notification areas
- Better visibility at sizes < 32px

### Status Bar Icon (Android)
- Pure white silhouette
- Required for Android status bar
- No colors or transparency

## Usage in Components

### React Native
```jsx
import { NotificationIcon } from '@/components/mediakit/NotificationIcon';
import { NotificationBadge } from '@/components/mediakit/NotificationBadge';

// Notification icon
<NotificationIcon variant="simplified" size={24} />

// Badge with count
<NotificationBadge count={5} variant="alert" />
```

### Configuration
Badge configuration is stored in `badge-config.json` and can be imported:

```javascript
import badgeConfig from '@/assets/badges/badge-config.json';

const { brandColors, badgeTypes } = badgeConfig;
```

## Icon Generation

Icons are generated from the source MediaKit design using the script at `scripts/generate-notification-icons.js`. To regenerate icons:

```bash
npm run generate:icons
```

This will create all required sizes for iOS, Android, and web platforms.

## Platform Requirements

### iOS
- Sizes: 20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180px
- Format: PNG with transparency
- Color space: sRGB

### Android
- Sizes: 24 (mdpi), 36 (hdpi), 48 (xhdpi), 72 (xxhdpi), 96 (xxxhdpi)px
- Status bar: White silhouette only
- Format: PNG with transparency

### Web
- Sizes: 16, 32, 48, 64, 128, 192, 256, 512px
- Format: PNG or SVG
- Favicon: 32px

## Color Palette

- **Primary Black**: #000000
- **Emerald Accent**: #4ECCA3
- **Bearish Red**: #F05454
- **Neutral Blue**: #30A5FF
- **White**: #FFFFFF

## Design Guidelines

1. **Simplicity**: Icons should be recognizable at 24px
2. **Contrast**: High contrast for visibility
3. **Consistency**: Use brand colors consistently
4. **Platform Compliance**: Follow platform-specific guidelines

## Updates

Last updated: 2025-09-09
Version: 1.0.0
