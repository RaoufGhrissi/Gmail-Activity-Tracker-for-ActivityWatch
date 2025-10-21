#!/bin/bash

# Create build directories
mkdir -p dist/chrome
mkdir -p dist/firefox

# Build Chrome version
echo "Building Chrome extension (MV3)..."
cp manifest.chrome.json dist/chrome/manifest.json
cp *.js *.html *.png dist/chrome/

# Build Firefox version
echo "Building Firefox extension (MV2)..."
cp manifest.firefox.json dist/firefox/manifest.json
cp *.js *.html *.png dist/firefox/

echo "Build complete! Extensions available in dist/chrome and dist/firefox."
