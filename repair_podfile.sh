#!/bin/bash
set -e

PODFILE="ios/Podfile"
SCHEME="IntegraMarkets"
WORKSPACE="ios/IntegraMarkets.xcworkspace"
ARCHIVE_PATH="build/IntegraMarkets.xcarchive"

echo "📦 Backing up Podfile..."
cp "$PODFILE" "${PODFILE}.bak.$(date +%s)"

echo "🧹 Cleaning up old post_install blocks..."
# Delete ALL lines between any stray "post_install do" and its "end"
sed -i '' '/post_install do/,/end/d' "$PODFILE"

echo "🔧 Inserting unified post_install block..."
cat <<'EOF' >> "$PODFILE"

post_install do |installer|
  react_native_post_install(
    installer,
    config: __dir__
  )

  # --- Fix for duplicate PrivacyInfo.xcprivacy ---
  installer.pods_project.targets.each do |target|
    if target.respond_to?(:resources_build_phase) && target.resources_build_phase
      target.resources_build_phase.files.each do |file|
        if file.display_name == 'PrivacyInfo.xcprivacy'
          puts "⚡️ Removing duplicate privacy manifest from #{target.name}"
          file.remove_from_project
        end
      end
    end
  end
end
EOF

echo "🧹 Resetting pods..."
cd ios
pod deintegrate || true
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

echo "✅ Podfile repaired and pods reinstalled."

echo "🧪 Running archive test with xcodebuild..."
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  SKIP_INSTALL=NO \
  BUILD_LIBRARY_FOR_DISTRIBUTION=YES | tee xcodebuild_test.log

echo "📂 Archive test complete. Check build/xcodebuild_test.log for details."