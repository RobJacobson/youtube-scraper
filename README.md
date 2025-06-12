# 🎭 YouTube Scraper

A powerful command-line YouTube channel scraper built with **Bun** and **Playwright**. Extract comprehensive metadata and take full-page screenshots of YouTube videos with advanced features like exponential backoff, error handling, and respectful rate limiting.

## ✨ Features

- 🎯 **Channel Video Discovery** - Automatically finds all videos from a YouTube channel
- 📊 **Comprehensive Metadata Extraction** - Captures title, description, author, views, dates, and more
- 📸 **Full-Page Screenshots** - Lossless PNG screenshots of entire video pages
- 🔄 **Exponential Backoff** - Respectful scraping with intelligent retry logic
- 📝 **Detailed Logging** - Verbose mode with colored console output
- 🛡️ **Error Handling** - Continues scraping even when individual videos fail
- ⚙️ **Flexible Configuration** - CLI options for limits, pagination, and delays
- 💾 **Structured Output** - Organized JSON files and screenshot directories
- 🚀 **High Performance** - Built on Bun runtime for maximum speed

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Linux environment (tested on Ubuntu)

### Installation

```bash
# Clone or navigate to the project directory
cd /home/rob/code/youtube-scraper

# Run the setup script
./scripts/install.sh
```

### Basic Usage

```bash
# Interactive mode (prompts for channel URL)
bun start

# Direct usage with channel URL
bun start --url "https://www.youtube.com/@WeAreUnidosUS"

# Scrape with custom options
bun start --url "https://www.youtube.com/@WeAreUnidosUS" --limit 50 --verbose
```

## 📋 Command Line Options

| Option                   | Description                      | Default            |
| ------------------------ | -------------------------------- | ------------------ |
| `-u, --url <url>`        | YouTube channel URL              | Interactive prompt |
| `-l, --limit <number>`   | Maximum videos to scrape         | 50                 |
| `-o, --offset <number>`  | Starting offset for pagination   | 0                  |
| `-d, --delay <number>`   | Base delay between requests (ms) | 1000               |
| `-r, --retries <number>` | Max retries for failed requests  | 3                  |
| `--headless`             | Run browser in headless mode     | false              |
| `--skip-screenshots`     | Skip taking screenshots          | false              |
| `--verbose`              | Enable detailed logging          | false              |
| `--help`                 | Show help information            | -                  |

## 💡 Usage Examples

### Basic Channel Scraping

```bash
bun start --url "https://www.youtube.com/@WeAreUnidosUS"
```

### Advanced Configuration

```bash
# Scrape 100 videos with 2-second delays, verbose logging
bun start \
  --url "https://www.youtube.com/@WeAreUnidosUS" \
  --limit 100 \
  --delay 2000 \
  --verbose \
  --headless
```

### Pagination Support

```bash
# Skip first 50 videos, get next 25
bun start \
  --url "https://www.youtube.com/@WeAreUnidosUS" \
  --offset 50 \
  --limit 25
```

### Screenshot-Only Mode

```bash
# Only collect metadata, skip screenshots
bun start \
  --url "https://www.youtube.com/@WeAreUnidosUS" \
  --skip-screenshots
```

## 📁 Output Structure

All data is saved to `/media/rob/D/youtube/metadata/[channel-name]/`:

```
/media/rob/D/youtube/metadata/WeAreUnidosUS/
├── data/
│   └── scraping_results_2024-01-15T14-30-00-000Z.json
└── screenshots/
    ├── dQw4w9WgXcQ_2024-01-15_14-30-15.png
    ├── jNQXAC9IVRw_2024-01-15_14-31-45.png
    └── ...
```

### JSON Output Format

```json
{
  "success": [
    {
      "id": "dQw4w9WgXcQ",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up",
      "description": "The official video for...",
      "author": "Rick Astley",
      "channelUrl": "/channel/UCuAXFkgsw1L7xaCfnd5JJOw",
      "publishedDate": "Oct 25, 2009",
      "duration": "3:33",
      "viewCount": "1.4B views",
      "likeCount": "15M",
      "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      "tags": ["music", "pop", "80s"],
      "category": "Music",
      "language": "en",
      "uploadDate": "2009-10-25T07:57:33Z",
      "scraped_at": "2024-01-15T14:30:15.123Z",
      "screenshot_path": "/media/rob/D/youtube/metadata/WeAreUnidosUS/screenshots/dQw4w9WgXcQ_2024-01-15_14-30-15.png"
    }
  ],
  "failed": [
    {
      "url": "https://www.youtube.com/watch?v=INVALID",
      "error": "Video unavailable",
      "retries_attempted": 3
    }
  ],
  "summary": {
    "total_attempted": 50,
    "successful": 49,
    "failed": 1,
    "duration_ms": 125000
  }
}
```

## 🛠️ Development

### Project Structure

```
src/
├── index.ts                    # CLI entry point
├── types/
│   ├── Config.ts              # Configuration interface
│   └── VideoMetadata.ts       # Data type definitions
├── scraper/
│   └── YouTubeScraper.ts      # Main scraper logic
└── utils/
    ├── ExponentialBackoff.ts   # Retry mechanism
    ├── fileSystem.ts          # File operations
    └── Logger.ts              # Logging utilities
```

### Building

```bash
# Build the project
bun run build

# Development mode with auto-reload
bun run dev
```

### Dependencies

- **Runtime**: Bun (fast JavaScript runtime)
- **Browser Automation**: Playwright (cross-browser testing framework)
- **CLI**: Commander.js (command-line interface)
- **UI**: Inquirer.js (interactive prompts)
- **Utilities**: chalk, date-fns, Node.js built-in fs APIs

## ⚡ Performance & Rate Limiting

The scraper implements several performance optimizations and ethical practices:

- **Exponential Backoff**: Automatically increases delays between retries
- **Jittered Timing**: Adds randomness to prevent detection patterns
- **Resource Management**: Properly closes browser contexts and pages
- **Memory Efficient**: Processes videos one at a time to avoid memory issues
- **Graceful Degradation**: Continues scraping even when individual videos fail

## 🔧 Troubleshooting

### Common Issues

**Permission Denied for Output Directory**

```bash
sudo mkdir -p /media/rob/D/youtube/metadata
sudo chown -R $USER:$USER /media/rob/D/youtube/metadata
```

**Browser Installation Issues**

```bash
bunx playwright install --with-deps
```

**Memory Issues with Large Channels**

```bash
# Use smaller batches
bun start --limit 25 --offset 0
bun start --limit 25 --offset 25
```

**Network Timeouts**

```bash
# Increase delays and retries
bun start --delay 3000 --retries 5
```

### Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
bun start --verbose --url "https://www.youtube.com/@WeAreUnidosUS"
```

## ⚖️ Legal & Ethical Considerations

**Important**: This tool is for educational and research purposes. Please ensure you comply with:

- YouTube's Terms of Service
- Applicable copyright laws
- Data protection regulations (GDPR, etc.)
- Respect for content creators' rights

**Best Practices**:

- Use reasonable delays between requests
- Don't overwhelm YouTube's servers
- Respect robots.txt if applicable
- Only scrape publicly available content
- Consider reaching out to creators for permission

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Enable verbose logging (`--verbose`)
3. Review the browser console for errors
4. Ensure your YouTube URL format is correct: `https://www.youtube.com/@channelname`

---

**Built with ❤️ using Bun and Playwright**
