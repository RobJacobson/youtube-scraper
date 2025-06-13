# 🎭 YouTube Scraper

A powerful command-line YouTube channel scraper built with **Bun** and **Playwright** using **functional programming architecture**. Extract comprehensive metadata and take full-page screenshots of YouTube videos with advanced features like intelligent popup dismissal, description expansion, UI theming, and respectful rate limiting.

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

### 🚀 Modern Functional Architecture

- **Pure Functional Design** - 100% functional programming with arrow functions throughout
- **Immutable Services** - Closure-based state management instead of classes
- **Functional Dependency Injection** - Clean service composition via parameters
- **Type-Safe Interfaces** - Comprehensive TypeScript with functional service contracts
- **Native Performance** - Built on Bun runtime with native Node.js APIs

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
├── index.ts                           # CLI entry point (functional)
├── application/                       # Application layer
│   └── youTubeScraperApplication.ts   # Main app service (functional)
├── core/                             # Core business logic
│   ├── container/                    # Dependency injection
│   │   └── serviceContainer.ts       # Service container (functional)
│   ├── factories/                    # Service factories
│   │   └── serviceFactory.ts         # Factory functions (functional)
│   └── services/                     # Business services (ALL FUNCTIONAL)
│       ├── browserService.ts         # Browser lifecycle management
│       ├── pageInteractionService.ts # YouTube page interactions
│       ├── metadataExtractionService.ts # Data extraction
│       ├── screenshotService.ts      # Screenshot handling
│       ├── videoDiscoveryService.ts  # Video URL discovery
│       └── scrapingOrchestrator.ts   # Main workflow orchestration
├── shared/                           # Shared utilities
│   └── constants/                    # Centralized constants
│       └── ScrapingConstants.ts      # All scraping constants
├── types/                            # Type definitions
│   ├── Config.ts                     # Configuration types
│   └── VideoMetadata.ts              # Data types
└── utils/                            # Utility functions
    ├── Logger.ts                     # Logging utilities
    ├── globalLogger.ts               # Global logger
    ├── fileSystem.ts                 # File operations
    └── ExponentialBackoff.ts         # Retry logic
```

### 🏗️ Functional Architecture Highlights

- **100% Functional Programming**: Complete refactor from OOP to functional paradigm
- **Arrow Functions Throughout**: Consistent functional syntax across the entire codebase
- **Closure-Based State**: State management via closures instead of class properties
- **Functional Dependency Injection**: Services receive dependencies as function parameters
- **Immutable Service Interfaces**: Clean contracts with TypeScript interfaces
- **Service Composition**: Higher-order functions for creating and composing services
- **Pure Functions**: Utility functions are pure where possible for better testability
- **Centralized Constants**: All configuration extracted to shared constants module

### 🎯 Functional Programming Benefits

- **Predictable Behavior**: Pure functions with no side effects where possible
- **Easy Testing**: Services can be easily mocked and tested in isolation
- **Better Composition**: Services compose naturally via function parameters
- **Immutability**: State changes are explicit and controlled via closures
- **No `this` Binding**: Arrow functions eliminate context binding issues
- **Type Safety**: Functional interfaces provide clear contracts
- **Memory Efficiency**: Closures manage state without class overhead

### 🔧 Service Architecture Pattern

```typescript
// Functional service creation pattern
export const createServiceName = (
  dependencies?: ServiceDeps
): ServiceInterface => {
  const logger = getLogger();
  let state = initialState; // Closure-based state

  const method1 = async (params): Promise<ReturnType> => {
    // Implementation using arrow function
  };

  return { method1, method2 };
};

// Dependency injection via parameters
const videoService = createVideoDiscoveryService(
  browserService,
  pageInteractionService
);
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

### 🏆 Architecture Achievements

- ✅ **13 files deleted** - Eliminated all legacy OOP code
- ✅ **100% functional** - Pure functional programming throughout
- ✅ **Arrow functions** - Consistent functional syntax
- ✅ **Closure state** - No classes, only functional closures
- ✅ **Clean interfaces** - Type-safe service contracts
- ✅ **Easy testing** - Mockable functional services
- ✅ **Better performance** - Optimized functional composition
