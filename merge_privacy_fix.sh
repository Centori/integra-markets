#!/bin/bash
set -e

PODFILE="ios/Podfile"

echo "🔧 Patching Podfile to merge privacy manifest cleanup into existing post_install..."

# Remove any old duplicate cleanup we may have added before
sed -i '' '/# --- Fix for duplicate PrivacyInfo.xcprivacy ---/,/end/d' "$PODFILE"

# Insert cleanup code before the last 'end' of the post_install block
awk '
  /post_install do/ { inside=1 }
  inside && /end/ && !inserted {
    print "  # --- Fix for duplicate PrivacyInfo.xcprivacy ---"
    print "  installer.pods_project.targets.each do |target|"
    print "    if target.respond_to?(:resources_build_phase) && target.resources_build_phase"
    print "      target.resources_build_phase.files.each do |file|"
    print "        if file.display_name == '\''PrivacyInfo.xcprivacy'\''"
    print "          puts \"⚡️ Removing duplicate privacy manifest from #{target.name}\""
    print "          file.remove_from_project"
    print "        end"
    print "      end"
    print "    end"
    print "  end"
    inserted=1
  }
  { print }
' "$PODFILE" > "${PODFILE}.tmp" && mv "${PODFILE}.tmp" "$PODFILE"

echo "🧹 Cleaning Pods..."
cd ios
pod deintegrate
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

echo "✅ Privacy fix merged into existing post_install"
echo "👉 Now try: open ios/IntegraMarkets.xcworkspace in Xcode and archive again."