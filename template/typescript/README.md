# PocketFlow-Template-Typescript

A comprehensive TypeScript template for creating PocketFlow applications with full async support.

## Features

- 🚀 **Full Async Support** - AsyncNode, AsyncFlow, AsyncBatchNode, AsyncParallelBatchNode
- 🔧 **TypeScript Configuration** - Modern TypeScript setup with strict type checking
- 📝 **ESLint and Prettier** - Code quality and formatting tools
- 🧪 **Vitest Testing** - Fast unit testing framework
- 🏗️ **Project Structure** - Organized structure for scalable applications
- 🤖 **LLM Integration** - Example utility functions and types
- 📚 **Comprehensive Examples** - Real-world async workflow examples
- 🔄 **Retry Logic** - Built-in error handling and retry mechanisms
- ⚡ **Concurrent Processing** - Parallel async processing capabilities
- 🎯 **AI Assistant Integration** - CLAUDE.md, GEMINI.md, and Copilot instructions

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run the basic template example
npm run dev

# Run the async demo (highly recommended!)
npm run demo:async

# Run comprehensive async examples
npm run demo:examples

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

## Quick Start: Async Workflow

```typescript
import { AsyncNode, AsyncFlow } from './async'

class QuestionProcessor extends AsyncNode {
  async prep_async(shared): Promise<string> {
    return shared.user_question || ''
  }

  async exec_async(question): Promise<string> {
    const prompt = `Answer this question: ${question}`
    return await callLlm(prompt)
  }

  async post_async(shared, prep_res, exec_res): Promise<string> {
    shared.answer = exec_res
    return undefined  // End workflow
  }
}

// Create and run async workflow
const questionNode = new QuestionProcessor()
const workflow = new AsyncFlow(questionNode)

await workflow.run_async({
  user_question: "What is artificial intelligence?"
})

console.log("Answer:", shared.answer)
```

## Project Structure

```
.
├── src/
│   ├── index.ts                    # Main entry point
│   ├── types.ts                    # Type definitions
│   ├── nodes.ts                    # Basic node definitions
│   ├── flow.ts                     # Flow related functionality
│   ├── async.ts                    # 🆕 Async extensions (AsyncNode, AsyncFlow, etc.)
│   ├── demo-async.ts               # 🆕 Interactive async demo
│   ├── examples/
│   │   └── async-examples.ts       # 🆕 Comprehensive async examples
│   └── utils/                      # Utility functions
│       └── callLlm.ts             # LLM API integration
├── docs/
│   ├── design.md                   # Design documentation
│   ├── async-guide.md              # 🆕 Complete async functionality guide
│   ├── CLAUDE.md                   # 🆕 AI assistant configuration (Claude)
│   ├── GEMINI.md                   # 🆕 AI assistant configuration (Gemini)
│   └── .github/
│       └── copilot-instructions.md # 🆕 GitHub Copilot integration
├── dist/                           # Compiled output
├── tsup.config.ts                  # Build configuration
├── eslint.config.mjs               # ESLint configuration
├── vitest.config.ts                # Vitest configuration
├── package.json                    # Project dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── .env.example                    # Example environment variables
└── README.md                       # Project documentation
```

## Async Functionality

This template includes comprehensive async support for PocketFlow:

### Core Async Classes

- **AsyncNode**: Async node with retry logic and error handling
- **AsyncFlow**: Async workflow orchestration
- **AsyncBatchNode**: Async batch processing
- **AsyncBatchFlow**: Async flow execution for multiple parameter sets
- **AsyncParallelBatchNode**: Concurrent async processing with configurable limits

### Key Features

- ✅ **Retry Logic**: Configurable retries with delays and fallback strategies
- ✅ **Error Handling**: Graceful fallback mechanisms for failed operations
- ✅ **Concurrent Processing**: Parallel execution with concurrency control
- ✅ **Mixed Workflows**: Combine sync and async nodes
- ✅ **Type Safety**: Full TypeScript support with proper typing

### Usage Examples

```typescript
// Basic async node with retry logic
class RobustLLMNode extends AsyncNode {
  constructor() {
    super()
    this.max_retries = 3  // Retry 3 times
    this.wait = 2         // 2 second delays
  }

  async exec_async(input: string): Promise<string> {
    return await callLlm(input)  // Will be retried on failure
  }

  async exec_fallback_async(input: string, error: Error): Promise<string> {
    return `Fallback: Could not process due to ${error.message}`
  }
}

// Concurrent batch processing
class ConcurrentProcessor extends AsyncParallelBatchNode {
  constructor() {
    super(5)  // Process 5 items concurrently
  }

  async process_item_async(item: any): Promise<any> {
    return await processItem(item)
  }
}
```

For detailed documentation, see [docs/async-guide.md](docs/async-guide.md).

## AI Assistant Integration

The template includes comprehensive AI assistant configuration:

- **CLAUDE.md**: Complete agentic coding guide for Claude AI
- **GEMINI.md**: Tailored guidance for Gemini AI development
- **.github/copilot-instructions.md**: GitHub Copilot integration instructions

These files provide detailed guidance for AI-assisted development with PocketFlow TypeScript.

## Customizing the Template

You can customize this template to fit your specific needs by:

1. Modifying the TypeScript configuration in `tsconfig.json`
2. Updating ESLint rules in `eslint.config.mjs`
3. Configuring the build process in `tsup.config.ts`
4. Adding more dependencies to `package.json`
5. Setting up environment variables using `.env` (see `.env.example`)
6. Extending async functionality in `src/async.ts`
7. Adding new examples in `src/examples/`

## License

MIT
