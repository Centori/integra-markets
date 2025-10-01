#!/bin/bash
set -e

PBXPROJ="ios/IntegraMarkets.xcodeproj/project.pbxproj"
TEAM_ID="86S4AC8C45" # your detected Team ID

echo "🔧 Forcing DEVELOPMENT_TEAM=$TEAM_ID into all build configurations..."

# Backup first
cp "$PBXPROJ" "${PBXPROJ}.bak.$(date +%s)"

# Insert DEVELOPMENT_TEAM into every build configuration if missing
sed -i '' "/PRODUCT_BUNDLE_IDENTIFIER/ {
  N
  /DEVELOPMENT_TEAM/! s/;\n/;\n\tDEVELOPMENT_TEAM = $TEAM_ID;\n/
}" "$PBXPROJ"

echo "✅ DEVELOPMENT_TEAM set in project.pbxproj"
grep -R "DEVELOPMENT_TEAM" "$PBXPROJ" | tail -n 10