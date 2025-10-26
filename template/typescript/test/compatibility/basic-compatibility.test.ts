import { describe, it, expect } from 'vitest'
import { Node, Flow } from 'pocketflow'
import { EnhancedAsyncNode, EnhancedAsyncFlow } from '../../src/enhancements'

// Test interfaces
interface BasicSharedStore {
  input?: string
  output?: string
}

interface ProcessingState {
  items: string[]
  results: string[]
  completed?: boolean
}

// Basic compatible node
class CompatibleNode extends Node<BasicSharedStore> {
  async prep(shared: BasicSharedStore): Promise<string> {
    return shared.input || 'default'
  }

  async exec(input: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 10))
    return `processed_${input}`
  }

  async post(shared: BasicSharedStore, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.output = execRes
    return undefined
  }
}

// Enhanced async node
class TestEnhancedNode extends EnhancedAsyncNode<ProcessingState> {
  async prep(shared: ProcessingState): Promise<string[]> {
    return shared.items
  }

  protected async processAsync(items: string[]): Promise<string[]> {
    return Promise.all(items.map(item =>
      new Promise<string>(resolve =>
        setTimeout(() => resolve(`enhanced_${item}`), 10)
      )
    ))
  }

  async post(shared: ProcessingState, prepRes: any, execRes: string[]): Promise<string | undefined> {
    shared.results = execRes
    shared.completed = true
    return undefined
  }
}

describe('Basic Compatibility Tests', () => {
  describe('Core Node Functionality', () => {
    it('should execute basic node lifecycle', async () => {
      const node = new CompatibleNode()
      const flow = new Flow(node)
      const shared: BasicSharedStore = { input: 'test' }

      await flow.run(shared)

      expect(shared.output).toBe('processed_test')
    })

    it('should handle default input', async () => {
      const node = new CompatibleNode()
      const flow = new Flow(node)
      const shared: BasicSharedStore = {}

      await flow.run(shared)

      expect(shared.output).toBe('processed_default')
    })
  })

  describe('Enhanced Async Functionality', () => {
    it('should provide enhanced async processing', async () => {
      const node = new TestEnhancedNode()
      const flow = new EnhancedAsyncFlow(node)
      const shared: ProcessingState = {
        items: ['item1', 'item2', 'item3'],
        results: []
      }

      await flow.run(shared)

      expect(shared.results).toEqual([
        'enhanced_item1',
        'enhanced_item2',
        'enhanced_item3'
      ])
      expect(shared.completed).toBe(true)
    })

    it('should track performance metrics', async () => {
      const node = new TestEnhancedNode()
      const flow = new EnhancedAsyncFlow(node)
      const shared: ProcessingState = {
        items: ['item1'],
        results: []
      }

      await flow.run(shared)

      const metrics = flow.getFlowMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].success).toBe(true)
      expect(metrics[0].executionTime).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle basic errors gracefully', async () => {
      class FailingNode extends Node<BasicSharedStore> {
        async exec(): Promise<string> {
          throw new Error('Test error')
        }

        async execFallback(): Promise<string> {
          return 'fallback_result'
        }

        async post(shared: BasicSharedStore, prepRes: any, execRes: string): Promise<string | undefined> {
          shared.output = execRes
          return undefined
        }
      }

      const node = new FailingNode({ maxRetries: 1 })
      const flow = new Flow(node)
      const shared: BasicSharedStore = { input: 'test' }

      // Should not throw with fallback configured
      await expect(flow.run(shared)).resolves.toBeUndefined()
    })
  })

  describe('Flow Transitions', () => {
    it('should handle basic flow transitions', async () => {
      class Step1Node extends Node<BasicSharedStore> {
        async prep(shared: BasicSharedStore): Promise<string> {
          return 'step1_input'
        }

        async exec(input: string): Promise<string> {
          return `step1_output_${input}`
        }

        async post(shared: BasicSharedStore, prepRes: any, execRes: string): Promise<string> {
          shared.output = execRes
          return 'step2'
        }
      }

      class Step2Node extends Node<BasicSharedStore> {
        async prep(shared: BasicSharedStore): Promise<string> {
          return shared.output || 'no_step1'
        }

        async exec(input: string): Promise<string> {
          return `step2_output_${input}`
        }

        async post(shared: BasicSharedStore, prepRes: any, execRes: string): Promise<string> {
          shared.output = execRes
          return undefined
        }
      }

      const step1 = new Step1Node()
      const step2 = new Step2Node()

      step1.on('step2', step2)
      const flow = new Flow(step1)
      const shared: BasicSharedStore = { input: 'test' }

      await flow.run(shared)

      expect(shared.output).toBe('step2_output_step1_output_step1_input')
    })
  })

  describe('Performance Characteristics', () => {
    it('should complete processing within reasonable time', async () => {
      const node = new TestEnhancedNode()
      const flow = new EnhancedAsyncFlow(node)
      const shared: ProcessingState = {
        items: ['item1', 'item2', 'item3', 'item4', 'item5'],
        results: []
      }

      const startTime = Date.now()
      await flow.run(shared)
      const executionTime = Date.now() - startTime

      expect(shared.results).toHaveLength(5)
      expect(executionTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})