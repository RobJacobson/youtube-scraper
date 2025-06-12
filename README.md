# 🎭 YouTube Scraper

A powerful command-line YouTube channel scraper built with **Bun** and **Playwright**. Extract comprehensive metadata and take full-page screenshots of YouTube videos with advanced features like intelligent popup dismissal, description expansion, UI theming, and respectful rate limiting.

## ✨ Features

### 🎯 Core Functionality

- **Channel Video Discovery** - Automatically finds all videos from a YouTube channel
- **Comprehensive Metadata Extraction** - Captures title, description, author, views, dates, tags, and more
- **Full-Page Screenshots** - High-quality PNG screenshots of entire video pages
- **Smart Description Expansion** - Automatically clicks "Show more" buttons to get complete descriptions

### 🛡️ Advanced Automation

- **Intelligent Popup Dismissal** - Automatically handles consent dialogs, subscription prompts, and notifications
- **UI Theme Control** - Dark mode, theater mode, and hide suggested videos
- **Exponential Backoff** - Respectful scraping with intelligent retry logic
- **Error Recovery** - Continues scraping even when individual videos fail

### ⚙️ Configuration & Performance

- **Flexible CLI Options** - Limits, pagination, delays, and UI preferences
- **Detailed Logging** - Verbose mode with colored console output and debugging
- **Memory Efficient** - Processes videos one at a time with proper cleanup
- **Structured Output** - Organized JSON files and screenshot directories

### 🚀 Modern Architecture

- **Functional Design** - Clean, modular architecture with separated concerns
- **Native Performance** - Built on Bun runtime with native Node.js APIs
- **Type Safety** - Full TypeScript implementation with comprehensive types

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh/) installed on your system
- Linux environment (tested on Ubuntu)

### Installation

```bash
# Clone or navigate to the project directory
cd /home/rob/code/youtube-scraper

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install --with-deps
```

### Basic Usage

```bash
# Interactive mode (prompts for channel URL)
bun start

# Direct usage with channel URL
bun start --url "https://www.youtube.com/@WeAreUnidosUS"

# Scrape with custom options
bun start --url "https://www.youtube.com/@WeAreUnidosUS" --limit 50 --verbose --dark-mode
```

## 📋 Command Line Options

### Basic Options

| Option                   | Description                      | Default            |
| ------------------------ | -------------------------------- | ------------------ |
| `-u, --url <url>`        | YouTube channel URL              | Interactive prompt |
| `-l, --limit <number>`   | Maximum videos to scrape         | 50                 |
| `-o, --offset <number>`  | Starting offset for pagination   | 0                  |
| `-d, --delay <number>`   | Base delay between requests (ms) | 1000               |
| `-r, --retries <number>` | Max retries for failed requests  | 3                  |

### Browser & Output Options

| Option               | Description                  | Default |
| -------------------- | ---------------------------- | ------- |
| `--headless`         | Run browser in headless mode | false   |
| `--skip-screenshots` | Skip taking screenshots      | false   |
| `--verbose`          | Enable detailed logging      | false   |

### 🎨 UI Enhancement Options

| Option             | Description                            | Default |
| ------------------ | -------------------------------------- | ------- |
| `--dark-mode`      | Enable dark mode for YouTube pages     | false   |
| `--theater-mode`   | Enable theater mode for video pages    | false   |
| `--hide-suggested` | Hide suggested videos and distractions | false   |

## 💡 Usage Examples

### Basic Channel Scraping

```bash
bun start --url "https://www.youtube.com/@WeAreUnidosUS"
```

### Enhanced UI Experience

```bash
# Dark mode with theater mode and no distractions
bun start \
  --url "https://www.youtube.com/@WeAreUnidosUS" \
  --dark-mode \
  --theater-mode \
  --hide-suggested \
  --verbose
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
      "description": "The official video for 'Never Gonna Give You Up'...",
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
├── index.ts                         # CLI entry point
├── types/
│   ├── Config.ts                   # Configuration interface
│   └── VideoMetadata.ts            # Data type definitions
├── scraper/
│   ├── scrapeYouTubeChannel.ts     # Main orchestrator (functional)
│   ├── getVideoUrls.ts             # Video URL discovery
│   ├── scrapeVideos.ts             # Video metadata scraping
│   ├── YouTubeScraper.ts           # Backward compatibility export
│   └── helpers/
│       ├── pageHelpers.ts          # UI manipulation & popup handling
│       ├── contentHelpers.ts       # Content extraction & expansion
│       └── metadataExtractor.ts    # DOM metadata extraction
└── utils/
    ├── ExponentialBackoff.ts        # Functional retry mechanism
    ├── fileSystem.ts               # Native Node.js file operations
    └── Logger.ts                   # Colored logging utilities
```

### 🏗️ Architecture Highlights

- **Functional Design**: Refactored from class-based to functional architecture
- **Modular Structure**: Each concern separated into focused modules
- **Type Safety**: Comprehensive TypeScript interfaces and types
- **Native APIs**: Uses Node.js built-in APIs instead of external dependencies
- **Constants**: All magic numbers extracted to module-level constants

### Building & Scripts

```bash
# Development mode with auto-reload
bun run dev

# Build the project
bun run build

# Format all code with Prettier
bun run format

# Check formatting without changes
bun run format:check

# Clean build artifacts
bun run clean
```

### Dependencies

- **Runtime**: Bun (fast JavaScript runtime)
- **Browser Automation**: Playwright (cross-browser testing framework)
- **CLI**: Commander.js (command-line interface)
- **UI**: Inquirer.js (interactive prompts)
- **Utilities**: chalk, date-fns, Node.js built-in fs APIs

## ⚡ Performance & Rate Limiting

The scraper implements several performance optimizations and ethical practices:

### 🛡️ Intelligent Automation

- **Smart Popup Dismissal**: Handles consent dialogs, subscription prompts, and notifications
- **Description Expansion**: Automatically clicks "Show more" to get complete descriptions
- **Video Pausing**: Prevents autoplay to reduce resource usage
- **Theme Application**: Applies dark mode and theater mode for better screenshots

### 🚀 Performance Optimizations

- **Functional Backoff**: Exponential delays with jitter for respectful scraping
- **Resource Management**: Proper cleanup of browser contexts and pages
- **Memory Efficiency**: Processes videos sequentially to avoid memory issues
- **Native Speed**: Uses Bun's native APIs for maximum performance

### 📊 Error Handling

- **Graceful Degradation**: Continues scraping even when individual videos fail
- **Retry Logic**: Intelligent retry with exponential backoff
- **Detailed Logging**: Comprehensive error reporting with context

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

**Popup Handling Issues**

```bash
# Enable verbose logging to see popup dismissal details
bun start --verbose --url "https://www.youtube.com/@WeAreUnidosUS"
```

### Debug Mode

Enable verbose logging to troubleshoot issues:

```bash
bun start --verbose --url "https://www.youtube.com/@WeAreUnidosUS"
```

This will show detailed logs including:

- Popup dismissal attempts
- Description expansion progress
- Screenshot capture process
- Error details and retry attempts

## ⚖️ Legal & Ethical Considerations

**Important**: This tool is for educational and research purposes. Please ensure you comply with:

- YouTube's Terms of Service
- Applicable copyright laws
- Data protection regulations (GDPR, etc.)
- Respect for content creators' rights

**Best Practices**:

- Use reasonable delays between requests (default: 1000ms)
- Don't overwhelm YouTube's servers
- Respect robots.txt if applicable
- Only scrape publicly available content
- Consider reaching out to creators for permission

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/your-username/youtube-scraper.git
cd youtube-scraper

# Install dependencies
bun install

# Install Playwright browsers
bunx playwright install --with-deps

# Format code before committing
bun run format
```

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Enable verbose logging (`--verbose`)
3. Review the browser console for errors
4. Ensure your YouTube URL format is correct: `https://www.youtube.com/@channelname`
5. Check that Playwright browsers are installed: `bunx playwright install`

---

**Built with ❤️ using Bun, Playwright, and modern functional architecture**
