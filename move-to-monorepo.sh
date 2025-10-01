#!/bin/bash
# Script to reorganize into monorepo structure

echo "📦 Creating monorepo structure..."

# Move all React Native files to apps/mobile
echo "Moving React Native app to apps/mobile..."
for item in ./*; do
    # Skip the apps directory and this script
    if [[ "$item" != "./apps" && "$item" != "./move-to-monorepo.sh" && "$item" != "./.git" ]]; then
        mv "$item" apps/mobile/ 2>/dev/null || true
    fi
done

# Move hidden files (except .git)
mv .vercelignore apps/mobile/ 2>/dev/null || true
mv .env* apps/mobile/ 2>/dev/null || true

echo "✅ React Native app moved to apps/mobile"
echo "📝 Next: Copy Next.js landing page to apps/landing"
