import { Flow, BatchNode } from 'pocketflow'
import { EnhancedAsyncNode } from './enhanced-async-nodes'

/**
 * Enhanced batch processing parameters
 */
export interface BatchParams {
  [key: string]: any
}

/**
 * Enhanced batch flow equivalent to Python's AsyncBatchFlow
 */
export class EnhancedBatchFlow<S = any> extends Flow<S> {
  private maxConcurrency: number
  private batchDelay?: number

  constructor(
    private batchProcessor: EnhancedBatchNode<S>,
    options?: { maxConcurrency?: number; batchDelay?: number }
  ) {
    super(batchProcessor)
    this.maxConcurrency = options?.maxConcurrency || 5
    this.batchDelay = options?.batchDelay
  }

  async run(shared: S): Promise<string | undefined> {
    // Check if we need to handle batch delays
    if (this.batchDelay && this.batchDelay > 0) {
      return this.runWithDelays(shared)
    }
    // Let the batch node handle the processing using PocketFlow's built-in batch processing
    return super.run(shared)
  }

  private async runWithDelays(shared: S): Promise<string | undefined> {
    const items = await this.batchProcessor.prep(shared)

    if (!items || items.length === 0) {
      return this.batchProcessor.post(shared, [], undefined)
    }

    const results: any[] = []
    for (let i = 0; i < items.length; i++) {
      // Add delay between items (except first one)
      if (i > 0 && this.batchDelay) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay))
      }

      try {
        const result = await this.batchProcessor.exec(items[i])
        results.push(result)
      } catch (error) {
        // Handle individual item failure
        if (this.batchProcessor.execFallback) {
          const fallbackResult = await this.batchProcessor.execFallback(items[i], error as Error)
          results.push(fallbackResult)
        } else {
          throw error
        }
      }
    }

    return this.batchProcessor.post(shared, items, results)
  }

  /**
   * Get flow execution metrics
   */
  getFlowMetrics(): Array<{ success: boolean; executionTime: number }> {
    return this.batchProcessor.getBatchMetrics().map(metric => ({
      success: metric.success,
      executionTime: metric.executionTime
    }))
  }
}

/**
 * Enhanced batch node with improved functionality
 */
export class EnhancedBatchNode<S = any> extends BatchNode<S> {
  private batchParams?: BatchParams
  private performanceMetrics: Array<{
    batchIndex: number
    itemCount: number
    executionTime: number
    success: boolean
    error?: Error
  }> = []

  async prep(shared: S): Promise<any[]> {
    return this.getInputItems(shared)
  }

  /**
   * Override this method to define how to extract input items from shared state
   */
  protected getInputItems(shared: S): any[] {
    // Default implementation - should be overridden
    return []
  }

  /**
   * Set batch parameters for execution
   */
  setBatchParams(params: BatchParams): void {
    this.batchParams = params
  }

  /**
   * Get current batch parameters
   */
  getBatchParams(): BatchParams | undefined {
    return this.batchParams
  }

  /**
   * Enhanced exec with performance tracking - this processes individual items
   * PocketFlow's BatchNode._exec() will call this for each item in the array
   */
  async exec(item: any): Promise<any> {
    const startTime = Date.now()
    const batchIndex = this.performanceMetrics.length

    try {
      const result = await this.processItem(item)

      this.performanceMetrics.push({
        batchIndex,
        itemCount: 1,
        executionTime: Date.now() - startTime,
        success: true
      })

      return result
    } catch (error) {
      this.performanceMetrics.push({
        batchIndex,
        itemCount: 1,
        executionTime: Date.now() - startTime,
        success: false,
        error: error as Error
      })
      throw error
    }
  }

  /**
   * Override this method to define item processing logic
   */
  protected async processItem(item: any): Promise<any> {
    // Default implementation - should be overridden
    return item
  }

  /**
   * Get batch performance metrics
   */
  getBatchMetrics(): Array<{
    batchIndex: number
    itemCount: number
    executionTime: number
    success: boolean
    error?: Error
  }> {
    return [...this.performanceMetrics]
  }

  /**
   * Clear batch metrics
   */
  clearBatchMetrics(): void {
    this.performanceMetrics = []
  }

  /**
   * Get batch statistics
   */
  getBatchStats(): {
    totalItems: number
    successCount: number
    failureCount: number
    averageExecutionTime: number
    totalExecutionTime: number
  } {
    const totalItems = this.performanceMetrics.length
    const successCount = this.performanceMetrics.filter(m => m.success).length
    const failureCount = totalItems - successCount
    const totalExecutionTime = this.performanceMetrics.reduce((sum, m) => sum + m.executionTime, 0)
    const averageExecutionTime = totalItems > 0 ? totalExecutionTime / totalItems : 0

    return {
      totalItems,
      successCount,
      failureCount,
      averageExecutionTime,
      totalExecutionTime
    }
  }
}

/**
 * Parallel batch node for concurrent processing
 * This overrides the _exec method to process all items in parallel
 */
export class ParallelBatchNode<S = any> extends EnhancedBatchNode<S> {
  async _exec(items: any[]): Promise<any[]> {
    const startTime = Date.now()

    try {
      // Process all items in parallel
      const results = await Promise.all(
        items.map(item => this.processItem(item))
      )

      this.performanceMetrics.push({
        batchIndex: this.performanceMetrics.length,
        itemCount: items.length,
        executionTime: Date.now() - startTime,
        success: true
      })

      return results
    } catch (error) {
      this.performanceMetrics.push({
        batchIndex: this.performanceMetrics.length,
        itemCount: items.length,
        executionTime: Date.now() - startTime,
        success: false,
        error: error as Error
      })
      throw error
    }
  }
}

/**
 * Utility function to create enhanced batch nodes
 */
export function createEnhancedBatchNode<S>(
  processFn: (item: any, params?: BatchParams) => Promise<any>,
  getInputFn?: (shared: S) => any[],
  postFn?: (shared: S, prepRes: any, execRes: any[]) => Promise<string | undefined>
): EnhancedBatchNode<S> {
  return new (class extends EnhancedBatchNode<S> {
    protected async processItem(item: any): Promise<any> {
      return processFn(item, this.batchParams)
    }

    protected getInputItems(shared: S): any[] {
      if (getInputFn) {
        return getInputFn(shared)
      }
      return []
    }

    async post(shared: S, prepRes: any, execRes: any[]): Promise<string | undefined> {
      if (postFn) {
        return postFn(shared, prepRes, execRes)
      }
      // Default behavior: store results in a 'results' property if it exists
      if (execRes && (shared as any).results !== undefined) {
        (shared as any).results = execRes
      }
      return undefined
    }
  })()
}

/**
 * Utility function to create enhanced batch flows
 */
export function createEnhancedBatchFlow<S>(
  batchProcessor: EnhancedBatchNode<S>,
  options?: { maxConcurrency?: number; batchDelay?: number }
): EnhancedBatchFlow<S> {
  return new EnhancedBatchFlow(batchProcessor, options)
}