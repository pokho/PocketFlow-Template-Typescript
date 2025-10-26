import { Node, Flow } from 'pocketflow'

/**
 * Enhanced Async Node using base PocketFlow library
 * This replaces the broken async.ts implementation
 */
export class EnhancedAsyncNode<T = any> extends Node<T> {
  private performanceMetrics: PerformanceMetrics[] = []

  constructor() {
    super()
  }

  async prep(shared: T): Promise<any> {
    return shared
  }

  async exec(prepRes: any): Promise<any> {
    const startTime = Date.now()

    try {
      const result = await this.processAsync(prepRes)

      this.performanceMetrics.push({
        executionTime: Date.now() - startTime,
        success: true,
        timestamp: Date.now()
      })

      return result
    } catch (error) {
      this.performanceMetrics.push({
        executionTime: Date.now() - startTime,
        success: false,
        error: error as Error,
        timestamp: Date.now()
      })
      throw error
    }
  }

  async execFallback(prepRes: any, error: Error): Promise<any> {
    // Default fallback implementation
    console.warn(`Async operation failed: ${error.message}`)
    return null
  }

  async post(shared: T, prepRes: any, execRes: any): Promise<string | undefined> {
    return 'next'
  }

  /**
   * Override this method in subclasses for async processing
   */
  protected async processAsync(input: any): Promise<any> {
    // Default implementation - should be overridden
    return input
  }

  /**
   * Get performance metrics for this node
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics]
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.performanceMetrics = []
  }
}

/**
 * Enhanced Async Flow with better error handling and monitoring
 */
export class EnhancedAsyncFlow<T = any> extends Flow<T> {
  private flowMetrics: FlowMetrics[] = []

  constructor(start: EnhancedAsyncNode<T>) {
    super(start)
  }

  async run(shared: T): Promise<string | undefined> {
    const startTime = Date.now()
    let result: string | undefined
    let error: Error | undefined

    try {
      result = await super.run(shared)

      this.flowMetrics.push({
        executionTime: Date.now() - startTime,
        success: true,
        timestamp: Date.now(),
        nodeCount: this.getNodeCount()
      })

      return result
    } catch (err) {
      error = err as Error

      this.flowMetrics.push({
        executionTime: Date.now() - startTime,
        success: false,
        error: error,
        timestamp: Date.now(),
        nodeCount: this.getNodeCount()
      })

      throw error
    }
  }

  /**
   * Get the number of nodes in this flow (simplified estimation)
   */
  private getNodeCount(): number {
    // This is a simplified version - in a real implementation,
    // you would traverse the flow graph to count nodes
    return 1
  }

  /**
   * Get flow execution metrics
   */
  getFlowMetrics(): FlowMetrics[] {
    return [...this.flowMetrics]
  }

  /**
   * Clear flow metrics
   */
  clearFlowMetrics(): void {
    this.flowMetrics = []
  }
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  executionTime: number
  success: boolean
  error?: Error
  timestamp: number
}

/**
 * Flow execution metrics
 */
export interface FlowMetrics {
  executionTime: number
  success: boolean
  error?: Error
  timestamp: number
  nodeCount: number
}

/**
 * Utility function to create enhanced async nodes
 */
export function createEnhancedAsyncNode<T>(
  processFn: (input: any) => Promise<any>,
  options?: { maxRetries?: number; wait?: number }
): EnhancedAsyncNode<T> {
  return class extends EnhancedAsyncNode<T> {
    protected async processAsync(input: any): Promise<any> {
      return processFn(input)
    }
  } as any
}

/**
 * Utility function to create enhanced async flows
 */
export function createEnhancedAsyncFlow<T>(
  nodes: EnhancedAsyncNode<T>[],
  connections: Array<{ from: EnhancedAsyncNode<T>; action: string; to: EnhancedAsyncNode<T> }>
): EnhancedAsyncFlow<T> {
  if (nodes.length === 0) {
    throw new Error('At least one node is required')
  }

  // Set up connections
  connections.forEach(({ from, action, to }) => {
    from.on(action, to)
  })

  return new EnhancedAsyncFlow(nodes[0])
}