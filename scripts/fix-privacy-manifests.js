const fs = require('fs');
const path = require('path');

function fixPrivacyManifests() {
  const iosDir = path.join(__dirname, '..', 'ios');
  const appDir = path.join(iosDir, 'IntegraMarkets');
  const appManifestPath = path.join(appDir, 'PrivacyInfo.xcprivacy');

  if (!fs.existsSync(iosDir)) {
    console.log('iOS directory not found, skipping privacy manifest fix');
    return;
  }

  // Find all PrivacyInfo.xcprivacy files (for logging only)
  const findPrivacyManifests = (dir) => {
    let results = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'build') {
        results = results.concat(findPrivacyManifests(filePath));
      } else if (file === 'PrivacyInfo.xcprivacy') {
        results.push(filePath);
      }
    }
    return results;
  };

  const manifests = findPrivacyManifests(iosDir);
  console.log(`Found ${manifests.length} privacy manifest(s)`);

  // Remove app-level manifest to avoid duplicate outputs when aggregation is enabled
  if (fs.existsSync(appManifestPath)) {
    try {
      fs.unlinkSync(appManifestPath);
      console.log(`Removed app manifest to prevent duplicates: ${appManifestPath}`);
    } catch (e) {
      console.warn('Failed to remove app manifest:', e.message);
    }
  } else {
    console.log('No app-level PrivacyInfo.xcprivacy found (ok)');
  }
}

fixPrivacyManifests();