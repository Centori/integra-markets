#!/usr/bin/env node

/**
 * Generate notification icons for all platforms from MediaKit source
 * This script creates properly sized notification icons for iOS, Android, and Web
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const badgeConfig = require('../assets/badges/badge-config.json');

// Base paths
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const SOURCE_ICON = path.join(ASSETS_DIR, 'images', 'integra-icon-original.png');
const OUTPUT_DIR = path.join(ASSETS_DIR, 'badges', 'icons');
const ANDROID_RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Ensure output directories exist
async function ensureDirectories() {
  const dirs = [
    path.join(OUTPUT_DIR, 'ios'),
    path.join(OUTPUT_DIR, 'android'),
    path.join(OUTPUT_DIR, 'web'),
    path.join(ASSETS_DIR, 'badges', 'generated'),
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Generate a simplified notification icon (white silhouette for Android)
 */
async function generateSimplifiedIcon(size, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="28" r="8" fill="white"/>
      <rect x="42" y="44" width="16" height="42" fill="white" rx="4"/>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
}

/**
 * Generate standard notification icon with proper transparency
 */
async function generateStandardIcon(size, outputPath, withBackground = false) {
  const input = sharp(SOURCE_ICON).resize(size, size);
  
  if (!withBackground) {
    // Remove background for notification icons
    await input
      .flatten({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outputPath);
  } else {
    await input.png().toFile(outputPath);
  }
}

/**
 * Generate iOS notification icons
 */
async function generateiOSIcons() {
  console.log('🍎 Generating iOS notification icons...');
  
  const sizes = badgeConfig.notificationIcons.default.sizes.ios;
  
  for (const size of sizes) {
    const outputPath = path.join(OUTPUT_DIR, 'ios', `notification-icon-${size}.png`);
    await generateStandardIcon(size, outputPath, false);
    console.log(`  ✓ Generated ${size}x${size} iOS icon`);
  }
}

/**
 * Generate Android notification icons (white silhouettes)
 */
async function generateAndroidIcons() {
  console.log('🤖 Generating Android notification icons...');
  
  const androidSizes = {
    'drawable-mdpi': 24,
    'drawable-hdpi': 36,
    'drawable-xhdpi': 48,
    'drawable-xxhdpi': 72,
    'drawable-xxxhdpi': 96,
  };
  
  for (const [folder, size] of Object.entries(androidSizes)) {
    // Generate for app's Android resources
    const resDir = path.join(ANDROID_RES_DIR, folder);
    await fs.mkdir(resDir, { recursive: true });
    
    const outputPath = path.join(resDir, 'notification_icon.png');
    await generateSimplifiedIcon(size, outputPath);
    console.log(`  ✓ Generated ${size}x${size} Android icon (${folder})`);
    
    // Also save to badges directory for reference
    const badgeOutputPath = path.join(OUTPUT_DIR, 'android', `notification-icon-${size}.png`);
    await generateSimplifiedIcon(size, badgeOutputPath);
  }
}

/**
 * Generate Web notification icons
 */
async function generateWebIcons() {
  console.log('🌐 Generating Web notification icons...');
  
  const sizes = badgeConfig.notificationIcons.default.sizes.web;
  
  for (const size of sizes) {
    const outputPath = path.join(OUTPUT_DIR, 'web', `notification-icon-${size}.png`);
    await generateStandardIcon(size, outputPath, true);
    console.log(`  ✓ Generated ${size}x${size} Web icon`);
  }
  
  // Generate special web assets
  const faviconPath = path.join(ASSETS_DIR, 'notification-favicon.png');
  await generateStandardIcon(32, faviconPath, true);
  console.log('  ✓ Generated notification favicon');
}

/**
 * Generate badge assets for different notification types
 */
async function generateBadgeAssets() {
  console.log('🎯 Generating badge assets...');
  
  for (const [type, config] of Object.entries(badgeConfig.badgeTypes)) {
    for (const size of config.sizes) {
      const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="${config.colors.background}"/>
          <circle cx="50" cy="30" r="6" fill="${config.colors.text}"/>
          <rect x="44" y="42" width="12" height="35" fill="${config.colors.text}" rx="3"/>
        </svg>
      `;
      
      const outputPath = path.join(ASSETS_DIR, 'badges', 'generated', `badge-${type}-${size}.png`);
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
      
      console.log(`  ✓ Generated ${type} badge (${size}px)`);
    }
  }
}

/**
 * Update notification icon in assets folder
 */
async function updateMainNotificationIcon() {
  console.log('📱 Updating main notification icon...');
  
  // Create a simplified version as the main notification icon
  const svg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <!-- Black background with rounded corners -->
      <rect width="1024" height="1024" fill="#000000" rx="102"/>
      
      <!-- Green border square -->
      <rect x="154" y="154" width="716" height="716" fill="none" stroke="#4ECCA3" stroke-width="30" rx="80"/>
      
      <!-- "i" symbol -->
      <circle cx="512" cy="350" r="50" fill="#4ECCA3"/>
      <rect x="462" y="450" width="100" height="300" fill="#4ECCA3" rx="20"/>
    </svg>
  `;
  
  const outputPath = path.join(ASSETS_DIR, 'notification-icon-new.png');
  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(outputPath);
  
  console.log('  ✓ Created new simplified notification icon');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting notification icon generation...\n');
    
    // Check if source icon exists
    try {
      await fs.access(SOURCE_ICON);
    } catch {
      console.error('❌ Source icon not found at:', SOURCE_ICON);
      console.log('   Please ensure integra-icon-original.png exists in assets/images/');
      process.exit(1);
    }
    
    // Ensure all directories exist
    await ensureDirectories();
    
    // Generate icons for each platform
    await generateiOSIcons();
    await generateAndroidIcons();
    await generateWebIcons();
    await generateBadgeAssets();
    await updateMainNotificationIcon();
    
    console.log('\n✅ All notification icons generated successfully!');
    console.log('📁 Icons saved to:', OUTPUT_DIR);
    console.log('\n💡 Next steps:');
    console.log('   1. Run "npm run ios" to rebuild iOS app with new icons');
    console.log('   2. Run "npm run android" to rebuild Android app with new icons');
    console.log('   3. Update app.json to reference notification-icon-new.png');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

// Check if sharp is installed
try {
  require('sharp');
} catch {
  console.error('❌ Sharp is not installed. Please run:');
  console.error('   npm install sharp --save-dev');
  process.exit(1);
}

// Run the script
main();
