#!/bin/bash
set -e

PODFILE="ios/Podfile"

echo "🔧 Patching Podfile with safe privacy manifest cleanup..."

# Remove any old cleanup blocks first
sed -i '' '/post_install do/,/end/d' "$PODFILE"

# Append safe post_install block
cat <<'EOF' >> "$PODFILE"

post_install do |installer|
  installer.pods_project.targets.each do |target|
    # Only modify real targets with resources, skip aggregate/meta ones
    next unless target.respond_to?(:resources_build_phase)

    target.resources_build_phase.files.each do |file|
      if file.display_name == 'PrivacyInfo.xcprivacy'
        puts "⚡️ Removing duplicate privacy manifest from #{target.name}"
        file.remove_from_project
      end
    end
  end
end
EOF

echo "🧹 Cleaning Pods..."
cd ios
pod deintegrate
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

echo "✅ Podfile patched and pods reinstalled!"
echo "👉 Now try: open ios/IntegraMarkets.xcworkspace in Xcode and archive again."