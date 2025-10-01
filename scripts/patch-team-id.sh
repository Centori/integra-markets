#!/bin/bash
set -euo pipefail

PBX="ios/IntegraMarkets.xcodeproj/project.pbxproj"

if [ ! -f "$PBX" ]; then
  echo "❌ pbxproj not found at $PBX"
  exit 1
fi

# Retrieve Apple Developer Team ID from local keychain code signing identities
TEAM_ID=$(security find-identity -v -p codesigning | grep -E "Apple (Development|Distribution):" | sed -E 's/.*\(([A-Z0-9]{10})\).*/\1/' | head -n 1 || true)
if [ -z "$TEAM_ID" ]; then
  echo "❌ Could not automatically retrieve Apple Team ID from keychain (no code signing identities found)."
  exit 1
fi

echo "✅ Detected Apple Team ID: $TEAM_ID"

# Extract XCBuildConfiguration object IDs and patch DEVELOPMENT_TEAM for each
IDS=$(awk '
  BEGIN{ id=""; isa=""; }
  /^[[:space:]]*[A-F0-9]{24}[[:space:]]*=\s*\{/ {
    match($0, /([A-F0-9]{24})/);
    id = substr($0, RSTART, RLENGTH);
    isa = "";
  }
  /isa[[:space:]]*=[[:space:]]*XCBuildConfiguration[[:space:]]*;/ { isa = "yes"; }
  /^[[:space:]]*};/ {
    if (isa == "yes" && id != "") { print id; }
    id = ""; isa = "";
  }
' "$PBX")

COUNT=0
for id in $IDS; do
  plutil -replace "objects.$id.buildSettings.DEVELOPMENT_TEAM" -string "$TEAM_ID" "$PBX"
  COUNT=$((COUNT+1))
  echo "🔧 Patched DEVELOPMENT_TEAM for configuration object $id"
done

echo "🎉 Patched DEVELOPMENT_TEAM for $COUNT configurations to $TEAM_ID"

echo "📄 Last occurrences of DEVELOPMENT_TEAM in pbxproj:"
grep -n "DEVELOPMENT_TEAM" "$PBX" | tail -n 30 || true