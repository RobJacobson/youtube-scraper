# Functional Programming Architecture

This document describes the functional programming architecture implemented for the YouTube Scraper project, replacing the previous object-oriented approach.

## Architecture Overview

The application has been refactored from class-based services to **functional services** using:

- **Arrow functions** throughout the codebase
- **Closures** for state management
- **Higher-order functions** for service creation
- **Functional dependency injection** via parameters
- **Immutable service interfaces**

## 🏗️ Functional Service Pattern

### Service Creation Pattern

```typescript
// Functional service factory pattern
export const createServiceName = (
  dependencies?: ServiceDeps
): ServiceInterface => {
  const logger = getLogger();
  let state = initialState; // Closure-based state

  const method1 = async (params): Promise<ReturnType> => {
    // Implementation using arrow function
  };

  const method2 = (params): ReturnType => {
    // Implementation using arrow function
  };

  return {
    method1,
    method2,
  };
};
```

### Dependency Injection Pattern

```typescript
// Services receive dependencies as parameters
export const createServiceWithDeps = (
  dep1: Service1,
  dep2: Service2
): ServiceInterface => {
  // Service implementation using injected dependencies
  const someMethod = async () => {
    await dep1.doSomething();
    return dep2.getSomething();
  };

  return { someMethod };
};
```

## 📁 Functional Services Structure

```
src/core/services/
├── browserService.ts           # Browser lifecycle management
├── pageInteractionService.ts   # YouTube page interactions
├── metadataExtractionService.ts # Data extraction
├── screenshotService.ts        # Screenshot handling
├── videoDiscoveryService.ts    # Video URL discovery
└── scrapingOrchestrator.ts     # Main workflow orchestration
```

## 🔧 Service Implementations

### 1. BrowserService (Functional)

```typescript
export const createBrowserService = (): BrowserService => {
  let state: BrowserState = { browser: null, context: null };

  const initialize = async (config: BrowserServiceConfig): Promise<void> => {
    // Functional implementation with closure state
  };

  const getContext = (): BrowserContext => {
    if (!state.context) throw new Error("Browser not initialized");
    return state.context;
  };

  return { initialize, getContext, cleanup, isInitialized };
};
```

### 2. PageInteractionService (Functional)

```typescript
export const createPageInteractionService = (): PageInteractionService => {
  const logger = getLogger();

  const handleConsentDialog = async (page: Page): Promise<void> => {
    // Arrow function implementation
  };

  const setupVideoPage = async (page: Page, config: Config): Promise<void> => {
    // Compose multiple operations functionally
    const tasks: Promise<void>[] = [];
    tasks.push(handleConsentDialog(page));
    tasks.push(dismissPopups(page));
    await Promise.allSettled(tasks);
  };

  return { handleConsentDialog, setupVideoPage /* ... */ };
};
```

### 3. Dependency Injection (Functional)

```typescript
export const createVideoDiscoveryService = (
  browserService: BrowserService,
  pageInteractionService: PageInteractionService
): VideoDiscoveryService => {
  const discoverVideoUrls = async (
    config: VideoDiscoveryConfig
  ): Promise<string[]> => {
    const context = browserService.getContext();
    const page = await context.newPage();

    await pageInteractionService.handleConsentDialog(page);
    // ... rest of implementation
  };

  return { discoverVideoUrls };
};
```

## 🏭 Service Container (Functional)

### Functional Container Pattern

```typescript
export const createServiceContainer = (): ServiceContainer => {
  // Create services with functional composition
  const browserService = createBrowserService();
  const pageInteractionService = createPageInteractionService();

  // Inject dependencies functionally
  const videoDiscoveryService = createVideoDiscoveryService(
    browserService,
    pageInteractionService
  );

  const cleanup = async (): Promise<void> => {
    if (browserService.isInitialized()) {
      await browserService.cleanup();
    }
  };

  return {
    browserService,
    pageInteractionService,
    videoDiscoveryService,
    cleanup,
  };
};
```

### Singleton Pattern (Functional)

```typescript
let containerInstance: ServiceContainer | null = null;

export const getServiceContainer = (): ServiceContainer => {
  if (!containerInstance) {
    containerInstance = createServiceContainer();
  }
  return containerInstance;
};
```

## 🎯 Key Functional Programming Benefits

### 1. **Immutability by Design**

- Services return new objects rather than mutating state
- State changes are explicit and controlled
- Easier to reason about data flow

### 2. **Pure Functions Where Possible**

- Many utility functions are pure (same input → same output)
- Side effects are isolated and clearly marked
- Better testability and predictability

### 3. **Composition Over Inheritance**

- Services are composed functionally rather than through class hierarchies
- More flexible and easier to understand
- Better separation of concerns

### 4. **Closure-Based State Management**

- State is encapsulated in closures
- No `this` binding issues
- Cleaner and more predictable state handling

## 🔄 Migration from OOP to Functional

### Before (OOP)

```typescript
export class BrowserService {
  private browser: Browser | null = null;

  async initialize(config: BrowserServiceConfig): Promise<void> {
    this.browser = await chromium.launch(config);
  }

  getContext(): BrowserContext {
    return this.browser.context();
  }
}
```

### After (Functional)

```typescript
export const createBrowserService = (): BrowserService => {
  let state: BrowserState = { browser: null, context: null };

  const initialize = async (config: BrowserServiceConfig): Promise<void> => {
    state.browser = await chromium.launch(config);
  };

  const getContext = (): BrowserContext => {
    return state.context;
  };

  return { initialize, getContext };
};
```

## 📊 Functional vs OOP Comparison

| Aspect                   | OOP Classes            | Functional Services           |
| ------------------------ | ---------------------- | ----------------------------- |
| **State Management**     | `this.property`        | Closure variables             |
| **Method Definition**    | `methodName() {}`      | `const methodName = () => {}` |
| **Dependency Injection** | Constructor parameters | Function parameters           |
| **Service Creation**     | `new Service()`        | `createService()`             |
| **Inheritance**          | `extends BaseClass`    | Function composition          |
| **Testing**              | Mock class methods     | Mock function returns         |
| **Memory**               | Instance per service   | Closure per service           |
| **Immutability**         | Manual enforcement     | Natural pattern               |

## 🧪 Testing Functional Services

### Mocking Functional Services

```typescript
// Easy to mock functional services
const mockBrowserService: BrowserService = {
  initialize: jest.fn(),
  getContext: jest.fn().mockReturnValue(mockContext),
  cleanup: jest.fn(),
  isInitialized: jest.fn().mockReturnValue(true),
};

// Test service with mocked dependencies
const videoDiscoveryService = createVideoDiscoveryService(
  mockBrowserService,
  mockPageInteractionService
);
```

### Testing Pure Functions

```typescript
// Many utility functions are now pure and easy to test
describe("extractVideoId", () => {
  it("should extract video ID from URL", () => {
    const url = "https://youtube.com/watch?v=abc123";
    const result = extractVideoId(url);
    expect(result).toBe("abc123");
  });
});
```

## 🚀 Usage Examples

### Basic Usage

```typescript
// Create application functionally
const app = createYouTubeScraperApplication();
await app.run(config);
```

### Custom Service Composition

```typescript
// Create services with custom dependencies
const browserService = createBrowserService();
const pageService = createPageInteractionService();
const discoveryService = createVideoDiscoveryService(
  browserService,
  pageService
);

// Use services directly
await browserService.initialize(config);
const urls = await discoveryService.discoverVideoUrls(discoveryConfig);
```

### Factory Pattern

```typescript
// Use factory for one-off service creation
const orchestrator = createScrapingOrchestratorWithDependencies();
const result = await orchestrator.scrapeChannel(config);
```

## 🎨 Functional Programming Principles Applied

### 1. **Higher-Order Functions**

- Service factories return service objects
- Functions that take other functions as parameters
- Composition of functionality

### 2. **Closures for Encapsulation**

- Private state management without classes
- Clean separation of concerns
- No `this` binding complexity

### 3. **Immutable Interfaces**

- Service interfaces define contracts
- Return new objects rather than mutating
- Predictable behavior

### 4. **Function Composition**

- Services compose other services
- Clear dependency chains
- Modular architecture

## 🔮 Future Enhancements

The functional architecture enables:

- **Easier testing** with pure functions and mocking
- **Better performance** with potential memoization
- **Functional reactive programming** patterns
- **Pipeline-based processing** for video data
- **Currying and partial application** for configuration
- **Monadic error handling** patterns

## 📝 Best Practices

### 1. **Arrow Functions Everywhere**

```typescript
// Prefer arrow functions for consistency
const processVideo = async (url: string): Promise<VideoMetadata> => {
  // Implementation
};
```

### 2. **Explicit Dependencies**

```typescript
// Make dependencies explicit in function parameters
const createService = (dep1: Service1, dep2: Service2): Service => {
  // Implementation
};
```

### 3. **Immutable Returns**

```typescript
// Return new objects, don't mutate parameters
const updateConfig = (config: Config, updates: Partial<Config>): Config => {
  return { ...config, ...updates };
};
```

### 4. **Pure Functions When Possible**

```typescript
// Prefer pure functions for utilities
const extractVideoId = (url: string): string => {
  const match = url.match(/[?&]v=([^&#]*)/);
  return match ? match[1] : "";
};
```

This functional architecture provides a clean, testable, and maintainable codebase while preserving all the benefits of the services layer pattern.
