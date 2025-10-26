import { describe, it, expect, beforeEach } from 'vitest'
import { Node, Flow } from 'pocketflow'
import {
  EnhancedAsyncNode,
  EnhancedAsyncFlow,
  TypeSafeNode,
  createValidator
} from '../../src/enhancements'

// Test interfaces matching Python PocketFlow patterns
interface BasicSharedStore {
  input?: string
  output?: string
}

interface ProcessingState {
  items: string[]
  results: string[]
  current_step?: string
  completed?: boolean
}

// Example node that matches Python behavior
class PythonCompatibleNode extends Node<BasicSharedStore> {
  async prep(shared: BasicSharedStore): Promise<string> {
    return shared.input || 'default_input'
  }

  async exec(input: string): Promise<string> {
    // Simulate processing that would be async in Python but is natural async here
    await new Promise(resolve => setTimeout(resolve, 10))
    return `processed_${input}`
  }

  async post(shared: BasicSharedStore, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.output = execRes
    return undefined // End flow (Python equivalent: return None)
  }
}

// Enhanced version using our new enhancements
class EnhancedProcessingNode extends EnhancedAsyncNode<ProcessingState> {
  async prep(shared: ProcessingState): Promise<string[]> {
    return shared.items
  }

  protected async processAsync(items: string[]): Promise<string[]> {
    // Process items in parallel (like Python's async)
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

// Type-safe version
class TypeSafeProcessingNode extends TypeSafeNode<BasicSharedStore> {
  async prep(shared: BasicSharedStore): Promise<string> {
    return shared.input || 'default'
  }

  async exec(input: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 5))
    return `type_safe_${input}`
  }

  async post(shared: BasicSharedStore, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.output = execRes
    return undefined
  }
}

describe('Python PocketFlow Compatibility Tests', () => {
  describe('Basic Node Compatibility', () => {
    it('should execute same lifecycle as Python Node class', async () => {
      const node = new PythonCompatibleNode()
      const shared: BasicSharedStore = { input: 'test_data' }

      // Test individual lifecycle methods
      const prepResult = await node.prep(shared)
      expect(prepResult).toBe('test_data')

      const execResult = await node.exec(prepResult)
      expect(execResult).toBe('processed_test_data')

      const postResult = await node.post(shared, prepResult, execResult)
      expect(postResult).toBeUndefined()
      expect(shared.output).toBe('processed_test_data')
    })

    it('should handle None equivalent (undefined) correctly', async () => {
      const node = new PythonCompatibleNode()
      const shared: BasicSharedStore = {} // No input provided

      const prepResult = await node.prep(shared)
      expect(prepResult).toBe('default_input')

      const execResult = await node.exec(prepResult)
      expect(execResult).toBe('processed_default_input')

      await node.post(shared, prepResult, execResult)
      expect(shared.output).toBe('processed_default_input')
    })
  })

  describe('Enhanced Async Compatibility', () => {
    it('should provide enhanced async functionality while maintaining compatibility', async () => {
      const node = new EnhancedProcessingNode()
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

      // Test performance metrics
      const flowMetrics = flow.getFlowMetrics()
      expect(flowMetrics).toHaveLength(1)
      expect(flowMetrics[0].success).toBe(true)
    })

    it('should handle errors gracefully like Python exceptions', async () => {
      class FailingEnhancedNode extends EnhancedAsyncNode<BasicSharedStore> {
        protected async processAsync(): Promise<any> {
          throw new Error('Simulated processing error')
        }

        async post(shared: BasicSharedStore, prepRes: any, execRes: any): Promise<string | undefined> {
          shared.output = 'fallback_result'
          return undefined
        }
      }

      const node = new FailingEnhancedNode({ maxRetries: 1 })
      const flow = new EnhancedAsyncFlow(node)
      const shared: BasicSharedStore = { input: 'test' }

      // Should not throw with proper error handling
      await expect(flow.run(shared)).resolves.toBeUndefined()
    })
  })

  describe('Type Safety Enhancement', () => {
    it('should validate shared store types', async () => {
      const validator = createValidator(
        (shared): shared is BasicSharedStore =>
          typeof shared === 'object' &&
          shared !== null &&
          'input' in shared &&
          typeof (shared as any).input === 'string',
        (shared): string[] => {
          const errors: string[] = []
          if (typeof shared !== 'object' || shared === null) {
            errors.push('Shared store must be an object')
          } else if (!('input' in shared)) {
            errors.push('Missing required property: input')
          } else if (typeof (shared as any).input !== 'string') {
            errors.push('Property "input" must be a string')
          }
          return errors
        }
      )

      const node = new TypeSafeProcessingNode(validator)
      const flow = new Flow(node)

      // Valid input should work
      const validShared: BasicSharedStore = { input: 'valid_input' }
      await expect(flow.run(validShared)).resolves.toBeUndefined()
      expect(validShared.output).toBe('type_safe_valid_input')

      // Invalid input should throw
      const invalidShared = { input: 123 } // wrong type
      await expect(flow.run(invalidShared as any)).rejects.toThrow(TypeError)
    })
  })

  describe('Flow Transition Compatibility', () => {
    it('should handle Python-style conditional transitions', async () => {
      class Step1Node extends Node<ProcessingState> {
        async prep(shared: ProcessingState): Promise<string> {
          return 'step1_complete'
        }

        async exec(input: string): Promise<string> {
          return input
        }

        async post(shared: ProcessingState, prepRes: any, execRes: string): Promise<string> {
          shared.current_step = 'step1'
          return 'step2' // Transition to step2
        }
      }

      class Step2Node extends Node<ProcessingState> {
        async prep(shared: ProcessingState): Promise<string> {
          return shared.current_step || 'no_step1'
        }

        async exec(input: string): Promise<string> {
          return `step2_processing_${input}`
        }

        async post(shared: ProcessingState, prepRes: any, execRes: string): Promise<string> {
          shared.results.push(execRes)
          shared.completed = true
          return undefined // End flow
        }
      }

      const step1 = new Step1Node()
      const step2 = new Step2Node()

      // Connect nodes (equivalent to Python's step1 >> step2)
      step1.on('step2', step2)

      const flow = new Flow(step1)
      const shared: ProcessingState = {
        items: [],
        results: []
      }

      await flow.run(shared)

      expect(shared.current_step).toBe('step1')
      expect(shared.results).toEqual(['step2_processing_step1'])
      expect(shared.completed).toBe(true)
    })
  })

  describe('Retry Logic Compatibility', () => {
    it('should implement retry behavior equivalent to Python', async () => {
      let attemptCount = 0

      class RetryTestNode extends Node<BasicSharedStore> {
        async exec(): Promise<string> {
          attemptCount++
          if (attemptCount < 3) {
            throw new Error(`Attempt ${attemptCount} failed`)
          }
          return 'success_after_retries'
        }

        async execFallback(prepRes: any, error: Error): Promise<string> {
          return 'fallback_result'
        }

        async post(shared: BasicSharedStore, prepRes: any, execRes: string): Promise<string | undefined> {
          shared.output = execRes
          return undefined
        }
      }

      const node = new RetryTestNode({ maxRetries: 2, wait: 0.01 })
      const flow = new Flow(node)
      const shared: BasicSharedStore = { input: 'test' }

      await flow.run(shared)

      expect(attemptCount).toBe(3) // 1 initial + 2 retries
      expect(shared.output).toBe('fallback_result')
    })
  })

  describe('Performance Characteristics', () => {
    it('should maintain reasonable performance compared to Python equivalent', async () => {
      const items = Array.from({ length: 10 }, (_, i) => `item_${i}`)
      const shared: ProcessingState = {
        items,
        results: []
      }

      const node = new EnhancedProcessingNode()
      const flow = new EnhancedAsyncFlow(node)

      const startTime = Date.now()
      await flow.run(shared)
      const executionTime = Date.now() - startTime

      expect(shared.results).toHaveLength(10)
      expect(shared.results.every(r => r.startsWith('enhanced_'))).toBe(true)
      expect(executionTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})