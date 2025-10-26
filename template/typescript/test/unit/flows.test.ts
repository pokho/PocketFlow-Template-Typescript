import { describe, it, expect, beforeEach } from 'vitest'
import { Node, Flow } from 'pocketflow'

// Test interfaces
interface TestSharedState {
  step1?: string
  step2?: string
  step3?: string
  completed?: boolean
}

// Test nodes
class Step1Node extends Node<TestSharedState> {
  async prep(shared: TestSharedState): Promise<string> {
    return 'step1 input'
  }

  async exec(input: string): Promise<string> {
    return 'step1 result'
  }

  async post(shared: TestSharedState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.step1 = execRes
    return 'next'
  }
}

class Step2Node extends Node<TestSharedState> {
  async prep(shared: TestSharedState): Promise<string> {
    return shared.step1 || 'no step1'
  }

  async exec(input: string): Promise<string> {
    return `step2 processed: ${input}`
  }

  async post(shared: TestSharedState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.step2 = execRes
    return 'next'
  }
}

class Step3Node extends Node<TestSharedState> {
  async prep(shared: TestSharedState): Promise<string> {
    return shared.step2 || 'no step2'
  }

  async exec(input: string): Promise<string> {
    return `step3 final: ${input}`
  }

  async post(shared: TestSharedState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.step3 = execRes
    shared.completed = true
    return undefined // End flow
  }
}

describe('Flow Tests', () => {
  let testState: TestSharedState

  beforeEach(() => {
    testState = {}
  })

  describe('Basic Flow Functionality', () => {
    it('should execute sequential flow correctly', async () => {
      const step1 = new Step1Node()
      const step2 = new Step2Node()
      const step3 = new Step3Node()

      // Connect nodes
      step1.on('next', step2)
      step2.on('next', step3)

      const flow = new Flow(step1)

      const result = await flow.run(testState)

      expect(testState.step1).toBe('step1 result')
      expect(testState.step2).toBe('step2 processed: step1 result')
      expect(testState.step3).toBe('step3 final: step2 processed: step1 result')
      expect(testState.completed).toBe(true)
      expect(result).toBeUndefined() // Flow completed
    })

    it('should handle single node flow', async () => {
      const step1 = new Step1Node()
      const flow = new Flow(step1)

      // Override post to end flow immediately
      step1.post = async (shared, prepRes, execRes) => {
        shared.step1 = execRes
        return undefined
      }

      await flow.run(testState)

      expect(testState.step1).toBe('step1 result')
      expect(testState.step2).toBeUndefined()
      expect(testState.step3).toBeUndefined()
    })
  })

  describe('Flow State Management', () => {
    it('should maintain shared state across nodes', async () => {
      const step1 = new Step1Node()
      const step2 = new Step2Node()

      step1.on('next', step2)
      const flow = new Flow(step1)

      // End flow after step2
      step2.post = async (shared, prepRes, execRes) => {
        shared.step2 = execRes
        return undefined
      }

      await flow.run(testState)

      expect(testState.step1).toBe('step1 result')
      expect(testState.step2).toBe('step2 processed: step1 result')
      expect(testState.step1).toBeDefined() // Previous state preserved
    })

    it('should start with initial shared state', async () => {
      const initialState: TestSharedState = {
        step1: 'initial value',
        completed: false
      }

      const step1 = new Step1Node()
      const flow = new Flow(step1)

      step1.post = async (shared, prepRes, execRes) => {
        shared.step1 = execRes
        return undefined
      }

      await flow.run(initialState)

      expect(initialState.step1).toBe('step1 result') // Overwritten by node
      expect(initialState.completed).toBe(false) // Preserved
    })
  })

  describe('Error Handling in Flows', () => {
    it('should handle basic node configuration', async () => {
      class SimpleNode extends Node<TestSharedState> {
        async prep(shared: TestSharedState): Promise<string> {
          return 'test'
        }

        async exec(input: string): Promise<string> {
          return 'result'
        }

        async post(shared: TestSharedState, prepRes: any, execRes: string): Promise<string | undefined> {
          shared.step1 = execRes
          return undefined
        }
      }

      const simpleNode = new SimpleNode()
      const flow = new Flow(simpleNode)

      await flow.run(testState)

      expect(testState.step1).toBe('result')
    })
  })

  describe('Flow Configuration', () => {
    it('should accept flow configuration', () => {
      const step1 = new Step1Node()
      const flow = new Flow(step1)

      expect(flow).toBeDefined()
      expect(flow.start).toBe(step1)
    })
  })
})