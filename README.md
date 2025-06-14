# 🎭 YouTube Scraper

A powerful command-line YouTube channel scraper built with **Bun** and **Playwright** using **functional programming architecture**. Extract comprehensive metadata, take full-page screenshots, and save complete webpages with advanced features like intelligent popup dismissal, description expansion, UI theming, and respectful rate limiting.

## ✨ Features

### 🎯 Core Functionality

- **Channel Video Discovery** - Automatically finds all videos from a YouTube channel
- **Comprehensive Metadata Extraction** - Captures title, description, author, views, dates, tags, and more
- **Full-Page Screenshots** - High-quality PNG screenshots of entire video pages
- **Complete HTML Saving** - Save self-contained HTML files with all CSS and assets inlined
- **Smart Description Expansion** - Automatically clicks "Show more" buttons to get complete descriptions

### 🛡️ Advanced Automation

- **Intelligent Popup Dismissal** - Automatically handles consent dialogs, subscription prompts, and notifications
- **UI Theme Control** - Dark mode, theater mode, and hide suggested videos
- **Exponential Backoff** - Respectful scraping with intelligent retry logic
- **Error Recovery** - Continues scraping even when individual videos fail

### ⚙️ Configuration & Performance

- **Flexible CLI Options** - Limits, pagination, delays, and UI preferences
- **Complete Webpage Export** - Save pages in "webpage complete" format with all assets
- **Detailed Logging** - Verbose mode with colored console output and debugging
- **Memory Efficient** - Buffer-based operations with proper cleanup
- **Structured Output** - Organized JSON files, screenshots, and HTML directories

### 🚀 Modern Streamlined Architecture

- **Buffer-Based Operations** - Efficient memory management with buffer handling
- **Functional Service Design** - Clean separation of concerns with functional patterns
- **Immutable Data Flow** - Predictable state management without side effects
- **Type-Safe Interfaces** - Comprehensive TypeScript with functional service contracts
- **Native Performance** - Built on Bun runtime with optimized file operations

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

| Option                 | Description                            | Default |
| ---------------------- | -------------------------------------- | ------- |
| `--dark-mode`          | Enable dark mode for YouTube pages     | false   |
| `--theater-mode`       | Enable theater mode for video pages    | false   |
| `--hide-suggested`     | Hide suggested videos and distractions | false   |
| `--save-complete-html` | Save complete webpage with all assets  | false   |

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

### Complete HTML Archiving

```bash
# Save complete webpages with all assets inlined
bun start \
  --url "https://www.youtube.com/@WeAreUnidosUS" \
  --save-complete-html \
  --dark-mode \
  --verbose
```

## 📁 Output Structure

All data is saved to organized directories in your output folder:

```
output/
├── metadata/
│   ├── 24-01-15_dQw4w9WgXcQ.json
│   ├── 24-01-15_jNQXAC9IVRw.json
│   └── ...
├── image/
│   ├── 24-01-15_dQw4w9WgXcQ.jpg
│   ├── 24-01-15_jNQXAC9IVRw.jpg
│   └── ...
├── screenshot/
│   ├── 24-01-15_dQw4w9WgXcQ.png
│   ├── 24-01-15_jNQXAC9IVRw.png
│   └── ...
├── html/
│   ├── 24-01-15_dQw4w9WgXcQ.html (complete HTML with inlined CSS)
│   ├── 24-01-15_jNQXAC9IVRw.html
│   └── ...
└── complete-html/
    ├── 24-01-15_dQw4w9WgXcQ/
    │   ├── index.html
    │   ├── styles.css
    │   ├── complete.html (self-contained)
    │   └── images/
    │       ├── image_0.jpg
    │       └── image_1.png
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
├── index.ts                          # CLI entry point
├── lib/                             # Core library modules
│   ├── browser.ts                   # Browser lifecycle management
│   ├── scraper.ts                   # Main scraping orchestration
│   ├── scrapeVideoPage.ts           # Video page scraping with HTML export
│   ├── scrapeChannelPage.ts         # Channel discovery
│   └── output.ts                    # Buffer-based file operations
├── types.ts                         # Type definitions and interfaces
└── utils/                           # Utility functions
    ├── logger.ts                    # Logging utilities
    └── ExponentialBackoff.ts        # Retry logic with backoff
```

### 🏗️ Streamlined Architecture Highlights

- **Buffer-Based Operations**: Memory-efficient handling of screenshots, images, and HTML content
- **Functional Service Design**: Clean separation between scraping, extraction, and file operations
- **Complete HTML Export**: Self-contained webpage saving with inlined CSS and assets
- **Modular Library Structure**: Focused modules for browser, scraping, output, and utilities
- **Type-Safe Interfaces**: Comprehensive TypeScript definitions for all data structures
- **Efficient File Operations**: Parallel saving operations with proper error handling
- **Immutable Data Flow**: Predictable data transformation pipeline
- **Resource Management**: Proper cleanup and memory management throughout

### 🎯 Architecture Benefits

- **Memory Efficiency**: Buffer-based operations reduce memory footprint
- **Parallel Processing**: Multiple file operations execute simultaneously
- **Error Resilience**: Individual failures don't stop the entire process
- **Clean Separation**: Distinct modules for different responsibilities
- **Type Safety**: Comprehensive TypeScript interfaces prevent runtime errors
- **Resource Cleanup**: Proper disposal of browser contexts and file handles
- **Extensible Design**: Easy to add new export formats or features

### 🔧 Core Module Pattern

```typescript
// Video page scraping with multiple outputs
export async function scrapeVideoPage(
  url: string,
  config: ScrapingConfig,
): Promise<VideoPageResult> {
  const { metadata, screenshot, image, htmlContent } = await scrapeVideo(
    url,
    config,
  );
  return { metadata, screenshot, image, htmlContent };
}

// Buffer-based file operations with parallel saving
export async function saveVideoDataFromBuffers(
  metadata: VideoMetadata,
  screenshot: Buffer,
  image: Buffer | null,
  baseOutputDir: string,
  htmlContent?: string,
): Promise<void> {
  const promises = [
    saveMetadata(metadata, baseOutputDir, fileName),
    saveScreenshot(screenshot, baseOutputDir, fileName),
    saveImage(image, baseOutputDir, fileName),
  ];

  if (htmlContent) {
    promises.push(saveHtml(htmlContent, baseOutputDir, fileName));
  }

  await Promise.all(promises);
}
```

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

### 🛡️ Intelligent Automation (Functional Services)

- **Smart Popup Dismissal**: PageInteractionService handles consent dialogs and notifications
- **Description Expansion**: Functional approach to clicking "Show more" buttons
- **Video Pausing**: Prevents autoplay to reduce resource usage
- **Theme Application**: Applies dark mode and theater mode via functional composition

### 🚀 Performance Optimizations (Functional Architecture)

- **Functional Backoff**: Pure exponential delay functions with jitter
- **Closure-Based Resource Management**: Proper cleanup via functional service patterns
- **Memory Efficiency**: Functional composition prevents memory leaks
- **Immutable State**: No side effects from state mutations
- **Native Speed**: Uses Bun's native APIs with functional wrappers

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

**Built with ❤️ using Bun, Playwright, and 100% functional programming architecture**

### 🏆 Recent Improvements

- ✅ **Complete HTML Export** - Save self-contained webpages with all assets
- ✅ **Buffer-Based Operations** - Memory-efficient handling of all file types
- ✅ **Streamlined Architecture** - Reduced codebase by 99 lines while adding features
- ✅ **Parallel File Operations** - Simultaneous saving of multiple file formats
- ✅ **Enhanced Type Safety** - Comprehensive interfaces for all data structures
- ✅ **Improved Error Handling** - Graceful degradation and detailed logging
- ✅ **Clean interfaces** - Type-safe service contracts
- ✅ **Easy testing** - Mockable functional services
- ✅ **Better performance** - Optimized functional composition
