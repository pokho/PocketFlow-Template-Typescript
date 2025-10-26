import { Node, Flow, BatchNode } from 'pocketflow'
import { EnhancedAsyncNode, EnhancedAsyncFlow } from './enhanced-async-nodes'
import { EnhancedBatchFlow, EnhancedBatchNode } from './enhanced-batch-flow'

/**
 * Map operation interface
 */
export interface MapOperation<T, R> {
  (item: T, index?: number): Promise<R> | R
}

/**
 * Reduce operation interface
 */
export interface ReduceOperation<T, R> {
  (accumulator: R, item: T, index?: number): Promise<R> | R
}

/**
 * Map-Reduce workflow state
 */
export interface MapReduceState<T, R> {
  items: T[]
  mapResults?: R[]
  reduceResult?: R
  currentStage: 'mapping' | 'reducing' | 'completed'
  error?: string
}

/**
 * Enhanced Map Node
 */
export class EnhancedMapNode<T = any, R = any> extends EnhancedAsyncNode<MapReduceState<T, R>> {
  private mapFn: MapOperation<T, R>
  private maxConcurrency: number

  constructor(mapFn: MapOperation<T, R>, maxConcurrency: number = 5) {
    super()
    this.mapFn = mapFn
    this.maxConcurrency = maxConcurrency
  }

  async prep(shared: MapReduceState<T, R>): Promise<T[]> {
    shared.currentStage = 'mapping'
    return shared.items
  }

  protected async processAsync(items: T[]): Promise<R[]> {
    // Process items in batches for concurrency control
    const chunks = this.chunkArray(items, this.maxConcurrency)
    const allResults: R[] = []

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map((item, index) => {
          const globalIndex = allResults.length + index
          return Promise.resolve(this.mapFn(item, globalIndex))
        })
      )
      allResults.push(...chunkResults)
    }

    return allResults
  }

  async post(shared: MapReduceState<T, R>, prepRes: any, execRes: R[]): Promise<string | undefined> {
    shared.mapResults = execRes
    shared.currentStage = 'reducing'
    return 'reduce'
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }
}

/**
 * Enhanced Reduce Node
 */
export class EnhancedReduceNode<T = any, R = any> extends EnhancedAsyncNode<MapReduceState<T, R>> {
  private reduceFn: ReduceOperation<R, R>
  private initialValue: R

  constructor(reduceFn: ReduceOperation<R, R>, initialValue: R) {
    super()
    this.reduceFn = reduceFn
    this.initialValue = initialValue
  }

  async prep(shared: MapReduceState<T, R>): Promise<{ results: R[]; initialValue: R }> {
    if (!shared.mapResults) {
      throw new Error('No map results available for reduction')
    }
    return { results: shared.mapResults, initialValue: this.initialValue }
  }

  protected async processAsync(input: { results: R[]; initialValue: R }): Promise<R> {
    const { results, initialValue } = input
    let accumulator = initialValue

    for (let i = 0; i < results.length; i++) {
      accumulator = await Promise.resolve(this.reduceFn(accumulator, results[i], i))
    }

    return accumulator
  }

  async post(shared: MapReduceState<T, R>, prepRes: any, execRes: R): Promise<string | undefined> {
    shared.reduceResult = execRes
    shared.currentStage = 'completed'
    return undefined
  }
}

/**
 * Map-Reduce Flow
 */
export class MapReduceFlow<T = any, R = any> extends EnhancedAsyncFlow<MapReduceState<T, R>> {
  private initialValue: R

  constructor(
    mapFn: MapOperation<T, R>,
    reduceFn: ReduceOperation<R, R>,
    initialValue: R,
    maxConcurrency: number = 5
  ) {
    const mapNode = new EnhancedMapNode<T, R>(mapFn, maxConcurrency)
    const reduceNode = new EnhancedReduceNode<T, R>(reduceFn, initialValue)

    mapNode.on('reduce', reduceNode)
    super(mapNode)
    this.initialValue = initialValue
  }

  async run(items: T[]): Promise<R> {
    const state: MapReduceState<T, R> = {
      items,
      currentStage: 'mapping'
    }

    // Handle empty input case
    if (!items || items.length === 0) {
      // For empty input, just return the initial value
      return this.initialValue
    }

    await super.run(state)

    if (!state.reduceResult) {
      throw new Error('Map-reduce operation failed to produce result')
    }

    return state.reduceResult
  }
}

/**
 * Word count example implementation
 */
export class WordCountFlow extends MapReduceFlow<string, Record<string, number>> {
  constructor() {
    const mapFn = async (text: string): Promise<Array<{ word: string; count: number }>> => {
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0)

      return words.map(word => ({ word, count: 1 }))
    }

    const reduceFn = async (
      accumulator: Record<string, number>,
      wordCounts: Array<{ word: string; count: number }>
    ): Promise<Record<string, number>> => {
      const result = { ...accumulator }

      for (const { word, count } of wordCounts) {
        result[word] = (result[word] || 0) + count
      }

      return result
    }

    const initialValue: Record<string, number> = {}

    super(mapFn, reduceFn, initialValue)
  }
}

/**
 * Enhanced Batch Map-Reduce Flow for large datasets
 */
export class BatchMapReduceFlow<T = any, R = any> extends MapReduceFlow<T, R> {
  private batchSize: number
  private batchDelay?: number

  constructor(
    mapFn: MapOperation<T, R>,
    reduceFn: ReduceOperation<R, R>,
    initialValue: R,
    batchSize: number = 100,
    options?: { maxConcurrency?: number; batchDelay?: number }
  ) {
    super(mapFn, reduceFn, initialValue, options?.maxConcurrency)
    this.batchSize = batchSize
    this.batchDelay = options?.batchDelay
  }
  private mapFn: MapOperation<T, R>
  private reduceFn: ReduceOperation<R, R>
  private initialValue: R
  private batchSize: number

  constructor(
    mapFn: MapOperation<T, R>,
    reduceFn: ReduceOperation<R, R>,
    initialValue: R,
    batchSize: number = 100,
    options?: { maxConcurrency?: number; batchDelay?: number }
  ) {
    const batchProcessor = new BatchMapReduceProcessor(mapFn, reduceFn, initialValue)
    super(batchProcessor, options)
    this.mapFn = mapFn
    this.reduceFn = reduceFn
    this.initialValue = initialValue
    this.batchSize = batchSize
  }

  async prepBatch(shared: {
    items: T[]
    batches: Array<{ items: T[]; results?: R[] }>
    finalResult?: R
    currentStage: 'preparing' | 'mapping' | 'reducing' | 'completed'
  }): Promise<Array<{ items: T[]; index: number }>> {
    shared.currentStage = 'preparing'

    const batches: Array<{ items: T[]; index: number }> = []
    for (let i = 0; i < shared.items.length; i += this.batchSize) {
      batches.push({
        items: shared.items.slice(i, i + this.batchSize),
        index: Math.floor(i / this.batchSize)
      })
    }

    shared.batches = batches.map(b => ({ items: b.items }))
    return batches
  }

  async post(
    shared: {
      items: T[]
      batches: Array<{ items: T[]; results?: R[] }>
      finalResult?: R
      currentStage: 'preparing' | 'mapping' | 'reducing' | 'completed'
    },
    prepRes: any,
    execRes: any
  ): Promise<string | undefined> {
    // Final reduction step
    shared.currentStage = 'reducing'

    const allResults: R[] = []
    shared.batches.forEach(batch => {
      if (batch.results) {
        allResults.push(...batch.results)
      }
    })

    let accumulator = this.initialValue
    for (const result of allResults) {
      accumulator = await Promise.resolve(this.reduceFn(accumulator, result))
    }

    shared.finalResult = accumulator
    shared.currentStage = 'completed'
    return undefined
  }

  async run(items: T[]): Promise<R> {
    const state = {
      items,
      batches: [],
      currentStage: 'preparing' as const
    }

    await super.run(state)

    if (!state.finalResult) {
      throw new Error('Batch map-reduce operation failed to produce result')
    }

    return state.finalResult
  }
}

/**
 * Batch map-reduce processor
 */
class BatchMapReduceProcessor<T = any, R = any> extends EnhancedBatchNode<{
  items: T[]
  batches: Array<{ items: T[]; results?: R[] }>
  finalResult?: R
  currentStage: 'preparing' | 'mapping' | 'reducing' | 'completed'
}> {
  private mapFn: MapOperation<T, R>
  private reduceFn: ReduceOperation<R, R>
  private initialValue: R
  private batchIndex?: number

  constructor(
    mapFn: MapOperation<T, R>,
    reduceFn: ReduceOperation<R, R>,
    initialValue: R
  ) {
    super()
    this.mapFn = mapFn
    this.reduceFn = reduceFn
    this.initialValue = initialValue
  }

  protected getInputItems(shared: {
    items: T[]
    batches: Array<{ items: T[]; results?: R[] }>
    finalResult?: R
    currentStage: 'preparing' | 'mapping' | 'reducing' | 'completed'
  }): T[] {
    if (this.batchParams) {
      const batchParams = this.batchParams as { items: T[]; index: number }
      this.batchIndex = batchParams.index
      return batchParams.items
    }
    return []
  }

  protected async processItem(item: T): Promise<R> {
    return Promise.resolve(this.mapFn(item, this.batchIndex))
  }

  async post(
    shared: {
      items: T[]
      batches: Array<{ items: T[]; results?: R[] }>
      finalResult?: R
      currentStage: 'preparing' | 'mapping' | 'reducing' | 'completed'
    },
    prepRes: any,
    execRes: R[]
  ): Promise<string | undefined> {
    if (this.batchIndex !== undefined && shared.batches[this.batchIndex]) {
      shared.batches[this.batchIndex].results = execRes
    }
    return undefined
  }
}

/**
 * Utility functions for creating map-reduce flows
 */
export function createMapReduceFlow<T, R>(
  mapFn: MapOperation<T, R>,
  reduceFn: ReduceOperation<R, R>,
  initialValue: R,
  options?: { maxConcurrency?: number }
): MapReduceFlow<T, R> {
  return new MapReduceFlow(mapFn, reduceFn, initialValue, options?.maxConcurrency)
}

export function createWordCountFlow(): WordCountFlow {
  return new WordCountFlow()
}

export function createBatchMapReduceFlow<T, R>(
  mapFn: MapOperation<T, R>,
  reduceFn: ReduceOperation<R, R>,
  initialValue: R,
  batchSize: number = 100,
  options?: { maxConcurrency?: number; batchDelay?: number }
): BatchMapReduceFlow<T, R> {
  return new BatchMapReduceFlow(mapFn, reduceFn, initialValue, batchSize, options)
}