# PocketFlow TypeScript Async Guide

This guide covers the comprehensive async functionality added to PocketFlow TypeScript, enabling powerful asynchronous workflows for LLM applications.

## Overview

The async extension provides:

- **AsyncNode**: For individual async operations with retry logic
- **AsyncFlow**: For orchestrating async workflows
- **AsyncBatchNode**: For async batch processing
- **AsyncBatchFlow**: For running flows multiple times with different parameters
- **AsyncParallelBatchNode**: For concurrent async processing

## Key Features

### 1. Async Node Lifecycle

Async nodes follow a four-phase async lifecycle:

```typescript
class MyAsyncNode extends AsyncNode<SharedStore> {
  async prep_async(shared: SharedStore): Promise<any> {
    // Phase 1: Async data preparation
    // Use for file I/O, API calls, database queries
  }

  async exec_async(prep_res: any): Promise<any> {
    // Phase 2: Async execution
    // Use for LLM calls, external APIs, async processing
  }

  async exec_fallback_async(prep_res: any, error: Error): Promise<any> {
    // Phase 3: Async fallback (optional)
    // Called when exec_async fails after all retries
  }

  async post_async(shared: SharedStore, prep_res: any, exec_res: any): Promise<string | undefined> {
    // Phase 4: Async post-processing
    // Use for saving results, user interaction, additional async steps
  }
}
```

### 2. Retry Logic and Error Handling

Async nodes include built-in retry logic:

```typescript
class RobustAsyncNode extends AsyncNode<SharedStore> {
  constructor() {
    super()
    this.max_retries = 3  // Retry up to 3 times
    this.wait = 2         // Wait 2 seconds between retries
  }

  async exec_async(data: any): Promise<any> {
    // This will be retried automatically if it throws
    return await someUnreliableOperation(data)
  }

  async exec_fallback_async(prep_res: any, error: Error): Promise<any> {
    // Called after all retries fail
    console.log('Using fallback due to error:', error.message)
    return getDefaultResult()
  }
}
```

### 3. Async Workflows

Create complex async workflows with branching:

```typescript
function createAsyncWorkflow(): AsyncFlow<SharedStore> {
  const node1 = new AsyncNode1()
  const node2 = new AsyncNode2()
  const node3 = new AsyncNode3()

  // Connect nodes with named actions
  node1
    .next(node2, 'success')     // If node1 returns 'success'
    .next(node3, 'fallback')    // If node1 returns 'fallback'

  return new AsyncFlow(node1)
}
```

## Usage Examples

### Basic Async Node

```typescript
import { AsyncNode } from './async'

class SummarizeAsyncNode extends AsyncNode<DocumentStore> {
  async prep_async(shared: DocumentStore): Promise<string> {
    return shared.document || ''
  }

  async exec_async(text: string): Promise<string> {
    const prompt = `Summarize: ${text}`
    return await callLlm(prompt)
  }

  async post_async(shared: DocumentStore, prep_res: string, exec_res: string): Promise<string> {
    shared.summary = exec_res
    return 'default'
  }
}
```

### File I/O Operations

```typescript
import { AsyncNode } from './async'
import * as fs from 'fs/promises'

class FileProcessorAsyncNode extends AsyncNode<FileStore> {
  async prep_async(shared: FileStore): Promise<string> {
    return shared.file_path || ''
  }

  async exec_async(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8')
  }

  async post_async(shared: FileStore, prep_res: string, exec_res: string): Promise<string> {
    shared.file_content = exec_res
    return 'process_content'
  }
}
```

### Batch Processing

```typescript
import { AsyncBatchNode } from './async'

class BatchSummarizeNode extends AsyncBatchNode<DocumentStore> {
  async prep_async(shared: DocumentStore): Promise<string[]> {
    return shared.chunks || []
  }

  async process_item_async(chunk: string): Promise<string> {
    const prompt = `Summarize: ${chunk}`
    return await callLlm(prompt)
  }

  async post_async(shared: DocumentStore, prep_res: string[], exec_res: string[]): Promise<string> {
    shared.summaries = exec_res
    return 'combine_summaries'
  }
}
```

### Concurrent Processing

```typescript
import { AsyncParallelBatchNode } from './async'

class ConcurrentUrlProcessor extends AsyncParallelBatchNode<UrlStore> {
  constructor() {
    super(5) // Process 5 URLs concurrently
  }

  async prep_async(shared: UrlStore): Promise<string[]> {
    return shared.urls || []
  }

  async process_item_async(url: string): Promise<any> {
    const response = await fetch(url)
    return await response.json()
  }

  async post_async(shared: UrlStore, prep_res: string[], exec_res: any[]): Promise<string> {
    shared.results = exec_res
    return 'default'
  }
}
```

### User Interaction

```typescript
class AsyncUserFeedbackNode extends AsyncNode<InteractiveStore> {
  async prep_async(shared: InteractiveStore): Promise<string> {
    return shared.proposal || ''
  }

  async exec_async(proposal: string): Promise<string> {
    console.log(`\nProposal: ${proposal}`)

    // Wait for user input asynchronously
    return new Promise((resolve) => {
      // In a real app, this could be a web interface or CLI prompt
      setTimeout(() => {
        resolve('User approved')
      }, 3000)
    })
  }

  async post_async(shared: InteractiveStore, prep_res: string, exec_res: string): Promise<string> {
    shared.feedback = exec_res
    return 'continue'
  }
}
```

## Running Async Workflows

### Basic Execution

```typescript
import { AsyncFlow } from './async'

const workflow = createAsyncWorkflow()
const sharedStore: MySharedStore = {}

await workflow.run_async(sharedStore)
console.log('Result:', sharedStore)
```

### Error Handling

```typescript
try {
  await workflow.run_async(sharedStore)
} catch (error) {
  console.error('Workflow failed:', error)

  if (error instanceof Error) {
    console.error('Details:', error.message)
  }
}
```

### Mixed Sync/Async Workflows

AsyncFlow can handle both sync and async nodes:

```typescript
import { Node } from 'pocketflow'
import { AsyncFlow, AsyncNode } from './async'

const syncNode = new Node()  // Regular sync node
const asyncNode = new AsyncNode()  // Async node

syncNode.next(asyncNode)
const mixedFlow = new AsyncFlow(syncNode)

await mixedFlow.run_async(sharedStore)
```

## Performance Considerations

### 1. Concurrency Control

Use `AsyncParallelBatchNode` with appropriate concurrency limits:

```typescript
// Process 3 items concurrently
const processor = new AsyncParallelBatchNode(3)

// For CPU-bound tasks, use lower concurrency
const cpuIntensiveProcessor = new AsyncParallelBatchNode(2)

// For I/O-bound tasks, use higher concurrency
const ioIntensiveProcessor = new AsyncParallelBatchNode(10)
```

### 2. Retry Strategies

Configure retry logic based on operation type:

```typescript
// For reliable operations
class ReliableNode extends AsyncNode {
  constructor() {
    super()
    this.max_retries = 1
    this.wait = 0
  }
}

// For unreliable external APIs
class ExternalApiNode extends AsyncNode {
  constructor() {
    super()
    this.max_retries = 5
    this.wait = 10  // 10 seconds
  }
}
```

### 3. Memory Management

For large batch operations, process data in chunks:

```typescript
class MemoryEfficientBatchNode extends AsyncBatchNode {
  async prep_async(shared: SharedStore): Promise<any[]> {
    const largeData = shared.large_dataset || []

    // Return chunks instead of all data at once
    return this.createChunks(largeData, 100)  // 100 items per chunk
  }

  private createChunks(data: any[], size: number): any[][] {
    const chunks = []
    for (let i = 0; i < data.length; i += size) {
      chunks.push(data.slice(i, i + size))
    }
    return chunks
  }
}
```

## Best Practices

### 1. Error Handling

Always implement fallback methods for critical operations:

```typescript
async exec_fallback_async(prep_res: any, error: Error): Promise<any> {
  console.error('Primary operation failed:', error.message)

  // Return a meaningful fallback
  return {
    status: 'degraded',
    data: getDefaultData(),
    error: error.message
  }
}
```

### 2. Logging

Add comprehensive logging for debugging:

```typescript
async exec_async(data: any): Promise<any> {
  console.log(`Starting async operation with data:`, data)

  try {
    const result = await performOperation(data)
    console.log(`Operation completed successfully`)
    return result
  } catch (error) {
    console.error(`Operation failed:`, error)
    throw error
  }
}
```

### 3. Type Safety

Use TypeScript interfaces for shared stores:

```typescript
interface ProcessingSharedStore {
  input_data?: string
  processed_data?: string
  metadata?: {
    timestamp?: number
    processing_time?: number
    status?: string
  }
}

class TypedAsyncNode extends AsyncNode<ProcessingSharedStore> {
  async post_async(
    shared: ProcessingSharedStore,
    prep_res: any,
    exec_res: string
  ): Promise<string> {
    shared.metadata = shared.metadata || {}
    shared.metadata.timestamp = Date.now()
    shared.processed_data = exec_res

    return 'default'
  }
}
```

### 4. Resource Cleanup

Clean up resources in error scenarios:

```typescript
class ResourceAwareAsyncNode extends AsyncNode<SharedStore> {
  private resource?: any

  async prep_async(shared: SharedStore): Promise<any> {
    this.resource = await allocateResource()
    return this.resource.process(shared.input)
  }

  async exec_fallback_async(prep_res: any, error: Error): Promise<any> {
    // Clean up resource on failure
    if (this.resource) {
      await this.resource.cleanup()
      this.resource = undefined
    }
    throw error
  }

  async post_async(shared: SharedStore, prep_res: any, exec_res: any): Promise<string> {
    // Resource will be cleaned up by garbage collector
    this.resource = undefined
    return 'default'
  }
}
```

## Migration from Sync to Async

### Converting Existing Nodes

1. **Change class extension**:
   ```typescript
   // Before
   class MyNode extends Node

   // After
   class MyNode extends AsyncNode
   ```

2. **Add async methods**:
   ```typescript
   // Before
   exec(prep_res: any): any { /* sync code */ }

   // After
   async exec_async(prep_res: any): Promise<any> { /* async code */ }
   ```

3. **Update method calls**:
   ```typescript
   // Before
   const result = someApi.call(data)

   // After
   const result = await someApi.call(data)
   ```

### Gradual Migration

You can mix sync and async nodes during migration:

```typescript
const syncNode = new ExistingSyncNode()
const asyncNode = new NewAsyncNode()

syncNode.next(asyncNode)
const migrationFlow = new AsyncFlow(syncNode)  // Works with mixed nodes
```

## Testing Async Workflows

### Unit Testing

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('MyAsyncNode', () => {
  it('should process data asynchronously', async () => {
    const node = new MyAsyncNode()
    const mockShared = { input: 'test data' }

    vi.spyOn(node, 'exec_async').mockResolvedValue('processed data')

    const result = await node.run_async(mockShared)

    expect(result).toBe('default')
    expect(mockShared.output).toBe('processed data')
  })
})
```

### Integration Testing

```typescript
it('should run complete workflow', async () => {
  const workflow = createTestWorkflow()
  const sharedStore = createTestData()

  await workflow.run_async(sharedStore)

  expect(sharedStore.final_result).toBeDefined()
  expect(sharedStore.processing_status).toBe('complete')
})
```

## Running the Examples

The template includes comprehensive examples:

```bash
# Run the main async demo
npm run demo:async

# Run comprehensive examples
npm run demo:examples

# Run the original template
npm run dev
```

## Summary

The PocketFlow TypeScript async extension provides:

- ✅ **Full async support** for all workflow phases
- ✅ **Retry logic** with configurable delays and fallback strategies
- ✅ **Batch processing** with async iteration
- ✅ **Concurrent processing** with configurable limits
- ✅ **Mixed sync/async workflows** for gradual migration
- ✅ **Type safety** with full TypeScript support
- ✅ **Comprehensive examples** and documentation

This enables building sophisticated async workflows for LLM applications while maintaining the simplicity and elegance of the PocketFlow framework.