import { describe, it, expect, beforeEach } from 'vitest'
import { Node } from 'pocketflow'

// Test interface for shared state
interface TestSharedState {
  input?: string
  output?: string
  processed?: boolean
}

// Test node implementations
class TestNode extends Node<TestSharedState> {
  async prep(shared: TestSharedState): Promise<string> {
    return shared.input || 'default'
  }

  async exec(input: string): Promise<string> {
    return `processed: ${input}`
  }

  async post(shared: TestSharedState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.output = execRes
    shared.processed = true
    return undefined
  }
}

class FailingNode extends Node<TestSharedState> {
  async prep(shared: TestSharedState): Promise<string> {
    return shared.input || 'default'
  }

  async exec(input: string): Promise<string> {
    throw new Error('Test error')
  }

  async execFallback(prepRes: any, error: Error): Promise<string> {
    return `fallback for: ${prepRes}`
  }

  async post(shared: TestSharedState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.output = execRes
    return undefined
  }
}

describe('Node Tests', () => {
  let testState: TestSharedState

  beforeEach(() => {
    testState = {}
  })

  describe('Basic Node Functionality', () => {
    it('should execute node lifecycle correctly', async () => {
      const node = new TestNode()

      const prepResult = await node.prep(testState)
      expect(prepResult).toBe('default')

      const execResult = await node.exec(prepResult)
      expect(execResult).toBe('processed: default')

      const postResult = await node.post(testState, prepResult, execResult)
      expect(postResult).toBeUndefined()
      expect(testState.output).toBe('processed: default')
      expect(testState.processed).toBe(true)
    })

    it('should handle input data correctly', async () => {
      const node = new TestNode()
      testState.input = 'test data'

      const prepResult = await node.prep(testState)
      expect(prepResult).toBe('test data')

      const execResult = await node.exec(prepResult)
      expect(execResult).toBe('processed: test data')
    })
  })

  describe('Error Handling', () => {
    it('should handle execution errors with fallback', async () => {
      const node = new FailingNode({ maxRetries: 1 })

      const prepResult = await node.prep(testState)
      expect(prepResult).toBe('default')

      // This should trigger fallback
      const execResult = await node.exec(prepResult).catch(() => node.execFallback(prepResult, new Error('Test')))
      expect(execResult).toBe('fallback for: default')
    })

    it('should accept retry configuration', () => {
      const nodeWithRetries = new TestNode({ maxRetries: 3, wait: 1.0 })
      expect(nodeWithRetries).toBeDefined()

      const nodeWithoutRetries = new TestNode()
      expect(nodeWithoutRetries).toBeDefined()
    })
  })

  describe('Type Safety', () => {
    it('should maintain type safety with shared state', async () => {
      const node = new TestNode()
      const typedState: TestSharedState = { input: 'typed input' }

      await node.prep(typedState)
      expect(typedState.input).toBe('typed input')

      const result = await node.exec('test')
      expect(typeof result).toBe('string')
    })
  })
})