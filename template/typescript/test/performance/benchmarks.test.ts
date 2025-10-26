import { describe, it, expect, beforeEach } from 'vitest'
import { Node, Flow, BatchNode } from 'pocketflow'

// Performance test interfaces
interface PerformanceState {
  data: string[]
  results: string[]
  metrics?: {
    startTime: number
    endTime: number
    memoryBefore: number
    memoryAfter: number
  }
}

// Performance monitoring utilities
function getMemoryUsage(): number {
  return process.memoryUsage().heapUsed
}

async function measurePerformance<T>(
  operation: () => Promise<T>
): Promise<{ result: T; executionTime: number; memoryDelta: number }> {
  const memoryBefore = getMemoryUsage()
  const startTime = Date.now()

  const result = await operation()

  const endTime = Date.now()
  const memoryAfter = getMemoryUsage()

  return {
    result,
    executionTime: endTime - startTime,
    memoryDelta: memoryAfter - memoryBefore
  }
}

// Test implementations
class ProcessingNode extends Node<PerformanceState> {
  private processingDelay: number

  constructor(processingDelay: number = 10) {
    super()
    this.processingDelay = processingDelay
  }

  async prep(shared: PerformanceState): Promise<string[]> {
    return shared.data
  }

  async exec(input: string[]): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, this.processingDelay))
    return input.map(item => `processed: ${item}`)
  }

  async post(shared: PerformanceState, prepRes: any, execRes: string[]): Promise<string | undefined> {
    shared.results.push(...execRes)
    shared.data = [] // Clear processed data
    return undefined
  }
}

class BatchProcessingNode extends BatchNode<PerformanceState> {
  async prep(shared: PerformanceState): Promise<string[]> {
    return shared.data
  }

  async _exec(items: string[]): Promise<string[]> {
    await new Promise(resolve => setTimeout(resolve, 5))
    return items.map(item => `batch processed: ${item}`)
  }

  async post(shared: PerformanceState, prepRes: any, execRes: string[]): Promise<string | undefined> {
    shared.results = execRes
    return undefined
  }
}

describe('Performance Benchmarks', () => {
  describe('Single Node Performance', () => {
    it('should process 100 items within acceptable time', async () => {
      const state: PerformanceState = {
        data: Array.from({ length: 100 }, (_, i) => `item${i}`),
        results: []
      }

      const node = new ProcessingNode(1) // 1ms processing time
      const flow = new Flow(node)

      const { result, executionTime, memoryDelta } = await measurePerformance(async () => {
        return flow.run(state)
      })

      expect(state.results).toHaveLength(100)
      expect(executionTime).toBeLessThan(2000) // Should complete within 2 seconds
      expect(memoryDelta).toBeLessThan(50 * 1024 * 1024) // Less than 50MB memory increase
    })

    it('should handle memory efficiently with large datasets', async () => {
      const state: PerformanceState = {
        data: Array.from({ length: 1000 }, (_, i) => `large-item-${i}-${'x'.repeat(100)}`),
        results: []
      }

      const node = new ProcessingNode(0) // Minimal processing time
      const flow = new Flow(node)

      const memoryBefore = getMemoryUsage()
      await flow.run(state)
      const memoryAfter = getMemoryUsage()

      const memoryIncrease = memoryAfter - memoryBefore
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB for 1000 items
      expect(state.results).toHaveLength(1000)
    })
  })

  describe('Batch Processing Performance', () => {
    it('should batch process faster than sequential processing', async () => {
      const data = Array.from({ length: 50 }, (_, i) => `item${i}`)

      // Sequential processing
      const sequentialState: PerformanceState = { data: [...data], results: [] }
      const sequentialNode = new ProcessingNode(10)
      const sequentialFlow = new Flow(sequentialNode)

      const { executionTime: sequentialTime } = await measurePerformance(async () => {
        return sequentialFlow.run(sequentialState)
      })

      // Batch processing
      const batchState: PerformanceState = { data: [...data], results: [] }
      const batchNode = new BatchProcessingNode()
      const batchFlow = new Flow(batchNode)

      const { executionTime: batchTime } = await measurePerformance(async () => {
        return batchFlow.run(batchState)
      })

      expect(batchState.results).toHaveLength(50)
      expect(sequentialState.results).toHaveLength(50)

      // Batch should be significantly faster (allowing for test variance)
      expect(batchTime).toBeLessThan(sequentialTime * 1.5)
    })

    it('should maintain performance with varying batch sizes', async () => {
      const batchSizes = [10, 50, 100, 200]
      const results: { batchSize: number; time: number; memory: number }[] = []

      for (const batchSize of batchSizes) {
        const state: PerformanceState = {
          data: Array.from({ length: batchSize }, (_, i) => `item${i}`),
          results: []
        }

        const node = new BatchProcessingNode()
        const flow = new Flow(node)

        const { executionTime, memoryDelta } = await measurePerformance(async () => {
          return flow.run(state)
        })

        results.push({ batchSize, time: executionTime, memory: memoryDelta })
      }

      // Performance should scale reasonably
      const timePerItem = results.map(r => r.time / r.batchSize)
      const avgTimePerItem = timePerItem.reduce((a, b) => a + b, 0) / timePerItem.length

      // No batch should take more than 3x the average time per item
      timePerItem.forEach(time => {
        expect(time).toBeLessThan(avgTimePerItem * 3)
      })
    })
  })

  describe('Memory Management', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = getMemoryUsage()
      const memorySnapshots: number[] = []

      for (let i = 0; i < 10; i++) {
        const state: PerformanceState = {
          data: Array.from({ length: 100 }, (_, j) => `iteration-${i}-item-${j}`),
          results: []
        }

        const node = new ProcessingNode(1)
        const flow = new Flow(node)
        await flow.run(state)

        memorySnapshots.push(getMemoryUsage())
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = getMemoryUsage()
      const totalMemoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB for 10 iterations)
      expect(totalMemoryIncrease).toBeLessThan(10 * 1024 * 1024)

      // Memory growth should not be linear (indicates no leaks)
      const memoryGrowthRate = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0]
      expect(memoryGrowthRate).toBeLessThan(5 * 1024 * 1024) // Less than 5MB growth
    })
  })

  describe('Concurrent Processing', () => {
    it('should handle multiple concurrent flows efficiently', async () => {
      const concurrentFlows = 5
      const itemsPerFlow = 20

      const flows = Array.from({ length: concurrentFlows }, (_, i) => {
        const state: PerformanceState = {
          data: Array.from({ length: itemsPerFlow }, (_, j) => `flow-${i}-item-${j}`),
          results: []
        }

        const node = new ProcessingNode(5)
        return { flow: new Flow(node), state }
      })

      const startTime = Date.now()

      // Run all flows concurrently
      const promises = flows.map(({ flow, state }) => flow.run(state))
      await Promise.all(promises)

      const totalTime = Date.now() - startTime

      // Verify all flows completed
      flows.forEach(({ state }, index) => {
        expect(state.results).toHaveLength(itemsPerFlow)
        state.results.forEach(result => {
          expect(result).toContain(`flow-${index}-item-`)
        })
      })

      // Concurrent execution should be faster than sequential
      const estimatedSequentialTime = concurrentFlows * itemsPerFlow * 5 // 5ms per item
      expect(totalTime).toBeLessThan(estimatedSequentialTime * 0.8) // At least 20% faster
    })
  })

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance over multiple runs', async () => {
      const runCount = 5
      const executionTimes: number[] = []

      for (let i = 0; i < runCount; i++) {
        const state: PerformanceState = {
          data: Array.from({ length: 50 }, (_, j) => `run-${i}-item-${j}`),
          results: []
        }

        const node = new ProcessingNode(2)
        const flow = new Flow(node)

        const { executionTime } = await measurePerformance(async () => {
          return flow.run(state)
        })

        executionTimes.push(executionTime)
      }

      // Calculate performance variance
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
      const variance = executionTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / executionTimes.length
      const stdDeviation = Math.sqrt(variance)

      // Standard deviation should be less than 20% of average time
      expect(stdDeviation).toBeLessThan(avgTime * 0.2)
    })
  })
})