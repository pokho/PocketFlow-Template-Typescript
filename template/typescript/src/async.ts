import { Node, Flow, BatchNode, BatchFlow } from 'pocketflow'

/**
 * Base interface for async shared store data
 */
export interface AsyncSharedStore {
  [key: string]: any
}

/**
 * AsyncNode extends Node with async method support
 *
 * Key features:
 * - async prep_async() for I/O-bound data preparation
 * - async exec_async() for async LLM calls and external APIs
 * - async exec_fallback_async() for graceful error handling
 * - async post_async() for post-processing and user feedback
 */
export class AsyncNode<T extends AsyncSharedStore = AsyncSharedStore> extends Node<T> {
  /**
   * Async preparation method - called before exec_async()
   * Use for I/O operations: file reading, API calls, database queries
   */
  async prep_async(shared: T): Promise<any> {
    // Default implementation - returns undefined
    return undefined
  }

  /**
   * Async execution method - main compute logic
   * Use for LLM calls, external API calls, async processing
   */
  async exec_async(prep_res: any): Promise<any> {
    // Default implementation - returns prep_res unchanged
    return prep_res
  }

  /**
   * Async fallback method - called when exec_async() fails after all retries
   */
  async exec_fallback_async(prep_res: any, error: Error): Promise<any> {
    // Default implementation - re-throw the error
    throw error
  }

  /**
   * Async post-processing method - called after exec_async()
   * Use for saving results, user interaction, additional async steps
   */
  async post_async(shared: T, prep_res: any, exec_res: any): Promise<string | undefined> {
    // Default implementation - return undefined (end flow)
    return undefined
  }

  /**
   * Run the async node with full async lifecycle
   */
  async run_async(shared: T): Promise<string | undefined> {
    try {
      // Step 1: Async preparation
      const prep_res = await this.prep_async(shared)

      // Step 2: Async execution with retry logic
      let exec_res: any
      let last_error: Error | undefined

      for (let attempt = 0; attempt < this.max_retries; attempt++) {
        try {
          this.cur_retry = attempt
          exec_res = await this.exec_async(prep_res)
          break // Success, exit retry loop
        } catch (error) {
          last_error = error as Error
          if (attempt < this.max_retries - 1 && this.wait > 0) {
            await this.delay(this.wait * 1000) // Convert to milliseconds
          }
        }
      }

      // If all retries failed, try fallback
      if (last_error && exec_res === undefined) {
        exec_res = await this.exec_fallback_async(prep_res, last_error)
      }

      // Step 3: Async post-processing
      return await this.post_async(shared, prep_res, exec_res)
    } catch (error) {
      console.error(`AsyncNode execution failed:`, error)
      throw error
    }
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * AsyncFlow extends Flow with async execution support
 *
 * Features:
 * - Run entire flows asynchronously
 * - Support mixed sync/async nodes
 * - Async branching and decision making
 */
export class AsyncFlow<T extends AsyncSharedStore = AsyncSharedStore> extends Flow<T> {
  /**
   * Run the async flow from start node
   */
  async run_async(shared: T): Promise<void> {
    if (!this.start) {
      throw new Error('AsyncFlow: No start node defined')
    }

    let current_node: Node<T> | AsyncNode<T> | undefined = this.start
    let current_action: string | undefined = 'default'

    while (current_node) {
      try {
        // Determine if current node is async
        if (current_node instanceof AsyncNode) {
          // Run async node
          current_action = await current_node.run_async(shared)
        } else {
          // Run sync node (for mixed flows)
          const action = current_node.run(shared)
          current_action = await Promise.resolve(action)
        }

        // Find next node based on action
        if (current_action === undefined) {
          break // Flow ended
        }

        current_node = this.transitions.get(`${current_node.id}_${current_action}`) ||
                       this.transitions.get(`${current_node.id}_default`)

      } catch (error) {
        console.error(`AsyncFlow execution failed at node ${current_node.id}:`, error)
        throw error
      }
    }
  }

  /**
   * Connect nodes with named actions for async flows
   */
  connect_async(source: Node<T> | AsyncNode<T>, action: string, target: Node<T> | AsyncNode<T>): void {
    this.connect(source, action, target)
  }
}

/**
 * AsyncBatchNode extends BatchNode with async batch processing
 *
 * Features:
 * - async prep_async() for generating async iterables
 * - async exec_async() for processing individual items
 * - async post_async() for aggregating results
 */
export class AsyncBatchNode<T extends AsyncSharedStore = AsyncSharedStore> extends AsyncNode<T> {
  /**
   * Async batch preparation - return iterable of items to process
   */
  async prep_async(shared: T): Promise<Iterable<any>> {
    return []
  }

  /**
   * Async batch execution - process each item asynchronously
   */
  async exec_async(prep_res: Iterable<any>): Promise<any[]> {
    const results: any[] = []

    for (const item of prep_res) {
      const result = await this.process_item_async(item)
      results.push(result)
    }

    return results
  }

  /**
   * Process individual batch items - override this method
   */
  async process_item_async(item: any): Promise<any> {
    return item
  }

  /**
   * Async batch post-processing
   */
  async post_async(shared: T, prep_res: Iterable<any>, exec_res: any[]): Promise<string | undefined> {
    return undefined
  }
}

/**
 * AsyncBatchFlow extends BatchFlow with async batch flow execution
 *
 * Features:
 * - Run entire flows multiple times with different parameters
 * - Async parameter preparation
 * - Async flow execution for each parameter set
 */
export class AsyncBatchFlow<T extends AsyncSharedStore = AsyncSharedStore> extends AsyncFlow<T> {
  /**
   * Async batch preparation - return list of parameter sets
   */
  async prep_async(shared: T): Promise<Record<string, any>[]> {
    return []
  }

  /**
   * Async batch execution - run flow for each parameter set
   */
  async exec_async(prep_res: Record<string, any>[]): Promise<void> {
    for (const params of prep_res) {
      // Create a new flow instance for this parameter set
      const flow_instance = this.create_flow_instance(params)

      // Run the flow asynchronously
      await flow_instance.run_async(this.shared || {} as T)
    }
  }

  /**
   * Create flow instance with specific parameters - override if needed
   */
  create_flow_instance(params: Record<string, any>): AsyncFlow<T> {
    // This is a simplified implementation
    // In practice, you'd want to clone the flow structure
    return this
  }
}

/**
 * AsyncParallelBatchNode for parallel async processing
 *
 * Features:
 * - Process multiple items concurrently
 * - Configurable concurrency limits
 * - Error handling for individual items
 */
export class AsyncParallelBatchNode<T extends AsyncSharedStore = AsyncSharedStore> extends AsyncBatchNode<T> {
  private concurrency_limit: number

  constructor(concurrency_limit: number = 5) {
    super()
    this.concurrency_limit = concurrency_limit
  }

  /**
   * Parallel batch execution with concurrency control
   */
  async exec_async(prep_res: Iterable<any>): Promise<any[]> {
    const items = Array.from(prep_res)
    const results: any[] = []

    // Process items in parallel batches
    for (let i = 0; i < items.length; i += this.concurrency_limit) {
      const batch = items.slice(i, i + this.concurrency_limit)
      const batch_results = await Promise.allSettled(
        batch.map(item => this.process_item_async(item))
      )

      // Handle results and errors
      for (const result of batch_results) {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Parallel batch item failed:', result.reason)
          // You might want to push a fallback value here
          results.push(null)
        }
      }
    }

    return results
  }
}

/**
 * Helper function to create async nodes with TypeScript type inference
 */
export function createAsyncNode<T extends AsyncSharedStore>(
  config: {
    prep_async?: (shared: T) => Promise<any>
    exec_async?: (prep_res: any) => Promise<any>
    exec_fallback_async?: (prep_res: any, error: Error) => Promise<any>
    post_async?: (shared: T, prep_res: any, exec_res: any) => Promise<string | undefined>
    max_retries?: number
    wait?: number
  }
): AsyncNode<T> {
  const node = new AsyncNode<T>()

  if (config.prep_async) node.prep_async = config.prep_async
  if (config.exec_async) node.exec_async = config.exec_async
  if (config.exec_fallback_async) node.exec_fallback_async = config.exec_fallback_async
  if (config.post_async) node.post_async = config.post_async

  return node
}

/**
 * Helper function to create async flows
 */
export function createAsyncFlow<T extends AsyncSharedStore>(
  start_node: AsyncNode<T> | Node<T>
): AsyncFlow<T> {
  return new AsyncFlow<T>(start_node)
}