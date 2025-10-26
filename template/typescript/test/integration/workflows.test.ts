import { describe, it, expect, beforeEach } from 'vitest'
import { Node, Flow, BatchNode } from 'pocketflow'

// Test interfaces
interface ProcessingState {
  inputs: string[]
  outputs: string[]
  currentStep?: string
  completed?: boolean
  errors?: string[]
}

// Utility function for testing
async function mockProcessing(input: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 10)) // Simulate async work
  return `processed: ${input}`
}

// Node implementations for testing
class InputNode extends Node<ProcessingState> {
  async prep(shared: ProcessingState): Promise<string[]> {
    return shared.inputs
  }

  async exec(inputs: string[]): Promise<string[]> {
    return inputs
  }

  async post(shared: ProcessingState, prepRes: any, execRes: string[]): Promise<string | undefined> {
    shared.currentStep = 'input_completed'
    return 'batch'
  }
}

class BatchProcessorNode extends BatchNode<ProcessingState> {
  async prep(shared: ProcessingState): Promise<string[]> {
    return shared.inputs
  }

  async exec(input: string): Promise<string> {
    return await mockProcessing(input)
  }

  async post(shared: ProcessingState, prepRes: any, execRes: string[]): Promise<string | undefined> {
    shared.outputs = execRes
    shared.currentStep = 'batch_completed'
    return 'validate'
  }
}

class ValidationNode extends Node<ProcessingState> {
  async prep(shared: ProcessingState): Promise<string[]> {
    return shared.outputs
  }

  async exec(outputs: string[]): Promise<boolean> {
    return outputs.length > 0 && outputs.every(o => o.startsWith('processed:'))
  }

  async post(shared: ProcessingState, prepRes: any, execRes: boolean): Promise<string | undefined> {
    shared.completed = execRes
    shared.currentStep = 'validation_completed'
    return undefined
  }
}

describe('Workflow Integration Tests', () => {
  let testState: ProcessingState

  beforeEach(() => {
    testState = {
      inputs: ['item1', 'item2', 'item3'],
      outputs: []
    }
  })

  describe('Complete Processing Workflow', () => {
    it('should execute end-to-end batch processing workflow', async () => {
      const inputNode = new InputNode()
      const batchNode = new BatchProcessorNode()
      const validationNode = new ValidationNode()

      // Connect workflow
      inputNode.on('batch', batchNode)
      batchNode.on('validate', validationNode)

      const workflow = new Flow(inputNode)

      await workflow.run(testState)

      expect(testState.outputs).toHaveLength(3)
      expect(testState.outputs).toEqual([
        'processed: item1',
        'processed: item2',
        'processed: item3'
      ])
      expect(testState.completed).toBe(true)
      expect(testState.currentStep).toBe('validation_completed')
    })

    it('should handle empty input gracefully', async () => {
      testState.inputs = []

      const inputNode = new InputNode()
      const batchNode = new BatchProcessorNode()
      const validationNode = new ValidationNode()

      inputNode.on('batch', batchNode)
      batchNode.on('validate', validationNode)

      const workflow = new Flow(inputNode)

      await workflow.run(testState)

      expect(testState.outputs).toEqual([])
      expect(testState.completed).toBe(false) // Validation fails for empty outputs
    })
  })

  describe('Error Recovery in Workflows', () => {
    it('should handle batch processing errors', async () => {
      class FailingBatchNode extends BatchNode<ProcessingState> {
        async exec(input: string): Promise<string> {
          if (input === 'item2') {
            throw new Error('Processing failed for item2')
          }
          return await mockProcessing(input)
        }

        async execFallback(prepRes: any, error: Error): Promise<string> {
          return `fallback: ${prepRes}`
        }
      }

      const inputNode = new InputNode()
      const failingBatchNode = new FailingBatchNode({ maxRetries: 1 })
      const validationNode = new ValidationNode()

      inputNode.on('batch', failingBatchNode)
      failingBatchNode.on('validate', validationNode)

      const workflow = new Flow(inputNode)

      await workflow.run(testState)

      expect(testState.outputs).toHaveLength(3)
      expect(testState.outputs).toContain('processed: item1')
      expect(testState.outputs).toContain('processed: item3')
      expect(testState.outputs.some(o => o.includes('fallback'))).toBe(true)
    })
  })

  describe('State Persistence', () => {
    it('should maintain state throughout complex workflow', async () => {
      const inputNode = new InputNode()
      const batchNode = new BatchProcessorNode()
      const validationNode = new ValidationNode()

      inputNode.on('batch', batchNode)
      batchNode.on('validate', validationNode)

      const workflow = new Flow(inputNode)

      const initialState = { ...testState, metadata: 'preserved' }
      await workflow.run(initialState)

      expect(initialState.inputs).toEqual(['item1', 'item2', 'item3'])
      expect(initialState.outputs).toHaveLength(3)
      expect((initialState as any).metadata).toBe('preserved')
      expect(initialState.completed).toBe(true)
    })
  })

  describe('Workflow Performance', () => {
    it('should complete workflow within reasonable time', async () => {
      const inputNode = new InputNode()
      const batchNode = new BatchProcessorNode()
      const validationNode = new ValidationNode()

      inputNode.on('batch', batchNode)
      batchNode.on('validate', validationNode)

      const workflow = new Flow(inputNode)

      const startTime = Date.now()
      await workflow.run(testState)
      const endTime = Date.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(1000) // Should complete within 1 second
    })
  })
})