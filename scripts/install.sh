#!/bin/bash

echo "🎭 Setting up YouTube Scraper..."

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
bunx playwright install

# Make sure output directory exists
echo "📁 Setting up output directories..."
mkdir -p /media/rob/D/youtube/metadata

echo "✅ Setup complete!"
echo ""
echo "Usage examples:"
echo "  bun start --url https://www.youtube.com/@WeAreUnidosUS"
echo "  bun start --limit 100 --verbose"
echo "  bun start --help" 