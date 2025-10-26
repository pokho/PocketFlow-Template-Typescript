import { describe, it, expect, beforeEach } from 'vitest'
import { Node, Flow, BatchNode } from 'pocketflow'
import { EnhancedAsyncNode, EnhancedAsyncFlow } from '../../src/enhancements'

// Test interfaces for different PocketFlow patterns
interface ChatState {
  messages: Array<{ role: string; content: string }>
  userInput?: string
  botResponse?: string
  shouldContinue?: boolean
}

interface BatchProcessingState {
  inputs: string[]
  outputs: string[]
  processed?: number
  completed?: boolean
}

interface WorkflowState {
  currentStage: string
  data: any
  results: Record<string, any>
  completed?: boolean
}

// Chat Pattern (like pocketflow-chat)
class ChatInputNode extends Node<ChatState> {
  async prep(shared: ChatState): Promise<string> {
    return shared.userInput || 'Hello'
  }

  async exec(input: string): Promise<string> {
    // Simulate LLM call
    await new Promise(resolve => setTimeout(resolve, 50))
    return `AI: ${input}`
  }

  async post(shared: ChatState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.botResponse = execRes
    shared.messages.push({ role: 'user', content: prepRes })
    shared.messages.push({ role: 'assistant', content: execRes })
    return shared.shouldContinue ? 'analyze' : undefined
  }
}

class ConversationAnalyzerNode extends Node<ChatState> {
  async prep(shared: ChatState): Promise<Array<{ role: string; content: string }>> {
    return shared.messages
  }

  async exec(messages: Array<{ role: string; content: string }>): Promise<boolean> {
    // Simple logic: continue if less than 4 messages
    return messages.length < 4
  }

  async post(shared: ChatState, prepRes: any, execRes: boolean): Promise<string | undefined> {
    shared.shouldContinue = execRes
    return execRes ? 'continue' : undefined
  }
}

class ChatLoopNode extends Node<ChatState> {
  async prep(shared: ChatState): Promise<string | undefined> {
    return shared.shouldContinue ? 'ready_for_input' : undefined
  }

  async exec(signal: string | undefined): Promise<string> {
    return signal || 'continue_chat'
  }

  async post(shared: ChatState, prepRes: any, execRes: string): Promise<string | undefined> {
    // Clear previous input for next round
    shared.userInput = `Round ${Math.floor(shared.messages.length / 2) + 2}`
    return 'chat_input'
  }
}

// Batch Processing Pattern (like pocketflow-batch)
class EnhancedBatchNode extends EnhancedAsyncNode<BatchProcessingState> {
  async prep(shared: BatchProcessingState): Promise<string[]> {
    return shared.inputs
  }

  protected async processAsync(items: string[]): Promise<string[]> {
    // Process items in parallel
    return Promise.all(items.map(async (item, index) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return `batch_processed_${item}_${index}`
    }))
  }

  async post(shared: BatchProcessingState, prepRes: any, execRes: string[]): Promise<string | undefined> {
    shared.outputs = execRes
    shared.processed = execRes.length
    shared.completed = true
    return undefined
  }
}

// Workflow Pattern (like pocketflow-workflow)
class Stage1Node extends Node<WorkflowState> {
  async prep(shared: WorkflowState): Promise<any> {
    return shared.data
  }

  async exec(data: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 20))
    return { stage1: 'processed', original: data }
  }

  async post(shared: WorkflowState, prepRes: any, execRes: any): Promise<string> {
    shared.results.stage1 = execRes
    shared.currentStage = 'stage2'
    return 'stage2'
  }
}

class Stage2Node extends Node<WorkflowState> {
  async prep(shared: WorkflowState): Promise<any> {
    return shared.results.stage1
  }

  async exec(stage1Result: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 15))
    return { stage2: 'processed', basedOn: stage1Result }
  }

  async post(shared: WorkflowState, prepRes: any, execRes: any): Promise<string> {
    shared.results.stage2 = execRes
    shared.currentStage = 'stage3'
    return 'stage3'
  }
}

class Stage3Node extends Node<WorkflowState> {
  async prep(shared: WorkflowState): Promise<any> {
    return shared.results.stage2
  }

  async exec(stage2Result: any): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 25))
    return { stage3: 'final', workflow: stage2Result }
  }

  async post(shared: WorkflowState, prepRes: any, execRes: any): Promise<string> {
    shared.results.stage3 = execRes
    shared.currentStage = 'completed'
    shared.completed = true
    return undefined
  }
}

describe('PocketFlow Pattern Matching Tests', () => {
  describe('Chat Pattern (pocketflow-chat equivalent)', () => {
    let chatState: ChatState

    beforeEach(() => {
      chatState = {
        messages: [],
        userInput: 'What is AI?',
        shouldContinue: true
      }
    })

    it('should handle self-looping conversation pattern', async () => {
      const inputNode = new ChatInputNode()
      const analyzerNode = new ConversationAnalyzerNode()
      const loopNode = new ChatLoopNode()

      // Set up the conversation loop
      inputNode.on('analyze', analyzerNode)
      analyzerNode.on('continue', loopNode)
      loopNode.on('chat_input', inputNode)

      const chatFlow = new Flow(inputNode)

      // First round
      await chatFlow.run(chatState)

      expect(chatState.messages).toHaveLength(2)
      expect(chatState.botResponse).toContain('AI: What is AI?')
      expect(chatState.shouldContinue).toBe(true)

      // Second round - should end since we have 4 messages now
      chatState.userInput = 'Tell me more'
      await chatFlow.run(chatState)

      expect(chatState.messages).toHaveLength(4)
      expect(chatState.shouldContinue).toBe(false)
    })
  })

  describe('Batch Processing Pattern (pocketflow-batch equivalent)', () => {
    let batchState: BatchProcessingState

    beforeEach(() => {
      batchState = {
        inputs: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
        outputs: []
      }
    })

    it('should process batch items efficiently', async () => {
      const batchNode = new EnhancedBatchNode()
      const batchFlow = new EnhancedAsyncFlow(batchNode)

      const startTime = Date.now()
      await batchFlow.run(batchState)
      const executionTime = Date.now() - startTime

      expect(batchState.outputs).toHaveLength(5)
      expect(batchState.outputs).toEqual([
        'batch_processed_doc1_0',
        'batch_processed_doc2_1',
        'batch_processed_doc3_2',
        'batch_processed_doc4_3',
        'batch_processed_doc5_4'
      ])
      expect(batchState.processed).toBe(5)
      expect(batchState.completed).toBe(true)

      // Should be faster than sequential processing
      expect(executionTime).toBeLessThan(100)

      // Check performance metrics
      const metrics = batchFlow.getFlowMetrics()
      expect(metrics).toHaveLength(1)
      expect(metrics[0].success).toBe(true)
    })

    it('should handle empty batch gracefully', async () => {
      batchState.inputs = []

      const batchNode = new EnhancedBatchNode()
      const batchFlow = new EnhancedAsyncFlow(batchNode)

      await batchFlow.run(batchState)

      expect(batchState.outputs).toEqual([])
      expect(batchState.processed).toBe(0)
      expect(batchState.completed).toBe(true)
    })
  })

  describe('Workflow Pattern (pocketflow-workflow equivalent)', () => {
    let workflowState: WorkflowState

    beforeEach(() => {
      workflowState = {
        currentStage: 'stage1',
        data: 'initial_data',
        results: {}
      }
    })

    it('should execute multi-stage workflow sequentially', async () => {
      const stage1 = new Stage1Node()
      const stage2 = new Stage2Node()
      const stage3 = new Stage3Node()

      // Connect workflow stages
      stage1.on('stage2', stage2)
      stage2.on('stage3', stage3)

      const workflow = new Flow(stage1)

      await workflow.run(workflowState)

      expect(workflowState.results.stage1).toEqual({
        stage1: 'processed',
        original: 'initial_data'
      })

      expect(workflowState.results.stage2).toEqual({
        stage2: 'processed',
        basedOn: {
          stage1: 'processed',
          original: 'initial_data'
        }
      })

      expect(workflowState.results.stage3).toEqual({
        stage3: 'final',
        workflow: {
          stage2: 'processed',
          basedOn: {
            stage1: 'processed',
            original: 'initial_data'
          }
        }
      })

      expect(workflowState.currentStage).toBe('completed')
      expect(workflowState.completed).toBe(true)
    })
  })

  describe('Pattern Performance Comparison', () => {
    it('should demonstrate performance advantages over sync Python patterns', async () => {
      const batchSizes = [5, 10, 20]
      const results: Array<{ batchSize: number; time: number }> = []

      for (const batchSize of batchSizes) {
        const state: BatchProcessingState = {
          inputs: Array.from({ length: batchSize }, (_, i) => `item_${i}`),
          outputs: []
        }

        const batchNode = new EnhancedBatchNode()
        const batchFlow = new EnhancedAsyncFlow(batchNode)

        const startTime = Date.now()
        await batchFlow.run(state)
        const executionTime = Date.now() - startTime

        results.push({ batchSize, time: executionTime })
      }

      // Verify performance scales reasonably (not linearly due to parallel processing)
      const timePerItem = results.map(r => r.time / r.batchSize)
      const avgTimePerItem = timePerItem.reduce((a, b) => a + b, 0) / timePerItem.length

      // Each batch should take less time than sequential processing would
      results.forEach(result => {
        const estimatedSequentialTime = result.batchSize * 15 // 15ms per item estimate
        expect(result.time).toBeLessThan(estimatedSequentialTime * 0.8) // At least 20% faster
      })
    })
  })

  describe('Error Handling in Patterns', () => {
    it('should handle errors gracefully in chat pattern', async () => {
      class FailingChatNode extends Node<ChatState> {
        async exec(): Promise<string> {
          throw new Error('LLM API failed')
        }

        async execFallback(): Promise<string> {
          return 'I apologize, I am experiencing technical difficulties.'
        }

        async post(shared: ChatState, prepRes: any, execRes: string): Promise<string | undefined> {
          shared.botResponse = execRes
          return undefined
        }
      }

      const chatState: ChatState = {
        messages: [],
        userInput: 'Test message'
      }

      const failingNode = new FailingChatNode({ maxRetries: 2 })
      const flow = new Flow(failingNode)

      await flow.run(chatState)

      expect(chatState.botResponse).toBeDefined()
      expect(chatState.botResponse).toContain('apologize')
      expect(chatState.messages).toHaveLength(1)
    })

    it('should handle partial batch failures', async () => {
      class PartialFailureBatchNode extends EnhancedAsyncNode<BatchProcessingState> {
        async prep(shared: BatchProcessingState): Promise<string[]> {
          return shared.inputs
        }

        protected async processAsync(items: string[]): Promise<string[]> {
          return Promise.all(items.map(async (item, index) => {
            if (index === 2) {
              throw new Error(`Failed to process ${item}`)
            }
            await new Promise(resolve => setTimeout(resolve, 10))
            return `processed_${item}`
          }))
        }
      }

      const batchState: BatchProcessingState = {
        inputs: ['item1', 'item2', 'item3', 'item4'],
        outputs: []
      }

      const batchNode = new PartialFailureBatchNode()
      const batchFlow = new EnhancedAsyncFlow(batchNode)

      // Should handle the error gracefully
      await expect(batchFlow.run(batchState)).rejects.toThrow('Failed to process item3')
    })
  })
})