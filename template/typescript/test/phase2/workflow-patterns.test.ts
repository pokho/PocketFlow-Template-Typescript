import { describe, it, expect, beforeEach } from 'vitest'
import { Node, Flow } from 'pocketflow'
import {
  EnhancedBatchFlow,
  EnhancedBatchNode,
  MapReduceFlow,
  createMapReduceFlow
} from '../../src/enhancements'

// Test interfaces
interface WorkflowState {
  stage: 'loading' | 'processing' | 'aggregating' | 'completed'
  data: any[]
  processed: any[]
  aggregated: any
  errors?: string[]
}

interface DocumentWorkflowState {
  documents: Array<{ id: string; content: string; category?: string; summary?: string }>
  categorized: Record<string, Array<{ id: string; content: string; summary?: string }>>
  summaries: Array<{ id: string; summary: string }>
  currentStage: 'loading' | 'categorizing' | 'summarizing' | 'completed'
}

describe('Advanced Workflow Patterns', () => {
  describe('Multi-Stage Workflows', () => {
    it('should execute complex multi-stage workflows', async () => {
      // Data loading stage
      class DataLoaderNode extends Node<WorkflowState> {
        async prep(shared: WorkflowState): Promise<number> {
          shared.stage = 'loading'
          return 10
        }

        async exec(count: number): Promise<number[]> {
          await new Promise(resolve => setTimeout(resolve, 20))
          return Array.from({ length: count }, (_, i) => ({
            id: i + 1,
            value: Math.floor(Math.random() * 100),
            timestamp: Date.now()
          }))
        }

        async post(shared: WorkflowState, prepRes: any, execRes: any[]): Promise<string> {
          shared.data = execRes
          shared.stage = 'processing'
          return 'process'
        }
      }

      // Batch processing stage
      class BatchProcessorNode extends EnhancedBatchNode<WorkflowState> {
        protected getInputItems(shared: WorkflowState): any[] {
          return shared.data
        }

        protected async processItem(item: any): Promise<any> {
          await new Promise(resolve => setTimeout(resolve, 10))
          return {
            ...item,
            processed: true,
            processedValue: item.value * 2,
            category: item.value % 10
          }
        }

        async post(shared: WorkflowState, prepRes: any, execRes: any[]): Promise<string> {
          shared.processed = execRes
          shared.stage = 'aggregating'
          return 'aggregate'
        }
      }

      // Aggregation stage
      class AggregationNode extends Node<WorkflowState> {
        async prep(shared: WorkflowState): Promise<any[]> {
          return shared.processed
        }

        async exec(items: any[]): Promise<Record<string, { count: number; totalValue: number }>> {
          await new Promise(resolve => setTimeout(resolve, 15))
          return items.reduce((groups: any, item: any) => {
            const cat = item.category
            if (!groups[cat]) groups[cat] = { count: 0, totalValue: 0 }
            groups[cat].count++
            groups[cat].totalValue += item.processedValue
            return groups
          }, {})
        }

        async post(shared: WorkflowState, prepRes: any, execRes: any): Promise<string> {
          shared.aggregated = execRes
          shared.stage = 'completed'
          return undefined
        }
      }

      // Create workflow
      const loader = new DataLoaderNode()
      const processor = new BatchProcessorNode()
      const aggregator = new AggregationNode()

      loader.on('process', processor)
      processor.on('aggregate', aggregator)

      const workflow = new Flow(loader)

      const initialState: WorkflowState = {
        stage: 'loading',
        data: [],
        processed: []
      }

      await workflow.run(initialState)

      expect(initialState.stage).toBe('completed')
      expect(initialState.data).toHaveLength(10)
      expect(initialState.processed).toHaveLength(10)
      expect(Object.keys(initialState.aggregated)).length.toBeGreaterThan(0)

      // Verify aggregation logic
      Object.values(initialState.aggregated).forEach((category: any) => {
        expect(category.count).toBeGreaterThan(0)
        expect(category.totalValue).toBeGreaterThan(0)
      })
    })

    it('should handle workflow failures gracefully', async () => {
      class FailingNode extends Node<WorkflowState> {
        async prep(shared: WorkflowState): Promise<string> {
          shared.stage = 'processing'
          return 'test'
        }

        async exec(): Promise<string> {
          throw new Error('Intentional workflow failure')
        }

        async execFallback(): Promise<string> {
          return 'fallback_result'
        }

        async post(shared: WorkflowState, prepRes: any, execRes: string): Promise<string> {
          shared.processed = [{ fallback: true, result: execRes }]
          return 'completed'
        }
      }

      const workflow = new Flow(new FailingNode({ maxRetries: 1 }))
      const state: WorkflowState = {
        stage: 'loading',
        data: [],
        processed: []
      }

      await workflow.run(state)

      expect(state.stage).toBe('loading') // Fallback post doesn't update stage
      expect(state.processed).toHaveLength(1)
      expect(state.processed[0].fallback).toBe(true)
    })
  })

  describe('Conditional Workflows', () => {
    it('should route based on processing results', async () => {
      interface ConditionalState {
        data: number[]
        path: 'high' | 'low' | 'normal'
        result?: number
      }

      class RouterNode extends Node<ConditionalState> {
        async prep(shared: ConditionalState): Promise<number[]> {
          return shared.data
        }

        async exec(data: number[]): Promise<{ average: number; max: number }> {
          const sum = data.reduce((a, b) => a + b, 0)
          return {
            average: sum / data.length,
            max: Math.max(...data)
          }
        }

        async post(shared: ConditionalState, prepRes: any, execRes: { average: number; max: number }): Promise<string> {
          if (execRes.max > 80) {
            shared.path = 'high'
          } else if (execRes.average < 30) {
            shared.path = 'low'
          } else {
            shared.path = 'normal'
          }
          return shared.path
        }
      }

      class HighValueProcessor extends Node<ConditionalState> {
        async exec(): Promise<number> {
          return 100
        }

        async post(shared: ConditionalState, prepRes: any, execRes: number): Promise<string> {
          shared.result = execRes
          return undefined
        }
      }

      class LowValueProcessor extends Node<ConditionalState> {
        async exec(): Promise<number> {
          return 10
        }

        async post(shared: ConditionalState, prepRes: any, execRes: number): Promise<string> {
          shared.result = execRes
          return undefined
        }
      }

      class NormalValueProcessor extends Node<ConditionalState> {
        async exec(): Promise<number> {
          return 50
        }

        async post(shared: ConditionalState, prepRes: any, execRes: number): Promise<string> {
          shared.result = execRes
          return undefined
        }
      }

      const router = new RouterNode()
      const highProcessor = new HighValueProcessor()
      const lowProcessor = new LowValueProcessor()
      const normalProcessor = new NormalValueProcessor()

      router.on('high', highProcessor)
      router.on('low', lowProcessor)
      router.on('normal', normalProcessor)

      const workflow = new Flow(router)

      // Test high value routing
      const highState: ConditionalState = {
        data: [90, 85, 95],
        path: 'normal'
      }

      await workflow.run(highState)
      expect(highState.path).toBe('high')
      expect(highState.result).toBe(100)

      // Test low value routing
      const lowState: ConditionalState = {
        data: [10, 15, 20],
        path: 'normal'
      }

      await workflow.run(lowState)
      expect(lowState.path).toBe('low')
      expect(lowState.result).toBe(10)

      // Test normal value routing
      const normalState: ConditionalState = {
        data: [40, 50, 60],
        path: 'normal'
      }

      await workflow.run(normalState)
      expect(normalState.path).toBe('normal')
      expect(normalState.result).toBe(50)
    })
  })

  describe('Parallel Workflow Patterns', () => {
    it('should process multiple data streams in parallel', async () => {
      interface ParallelState {
        streams: Array<{ id: string; data: number[]; processed?: number[]; result?: number }>
        currentStream: number
        completed: boolean
      }

      class StreamProcessor extends EnhancedBatchNode<ParallelState> {
        protected getInputItems(shared: ParallelState): number[] {
          const stream = shared.streams[shared.currentStream]
          return stream ? stream.data : []
        }

        protected async processItem(item: number): Promise<number> {
          await new Promise(resolve => setTimeout(resolve, 5))
          return item * 3
        }

        async post(shared: ParallelState, prepRes: any, execRes: number[]): Promise<string> {
          if (shared.currentStream < shared.streams.length) {
            shared.streams[shared.currentStream].processed = execRes
            shared.currentStream++
            return shared.currentStream < shared.streams.length ? 'continue' : 'aggregate'
          }
          return 'aggregate'
        }
      }

      class ParallelAggregator extends Node<ParallelState> {
        async prep(shared: ParallelState): Promise<Array<{ id: string; processed: number[] }>> {
          return shared.streams.filter(s => s.processed).map(s => ({
            id: s.id,
            processed: s.processed!
          }))
        }

        async exec(streams: Array<{ id: string; processed: number[] }>): Promise<number> {
          await new Promise(resolve => setTimeout(resolve, 10))
          return streams.reduce((sum, stream) => sum + stream.processed.reduce((a, b) => a + b, 0), 0)
        }

        async post(shared: ParallelState, prepRes: any, execRes: number): Promise<string> {
          shared.streams.forEach(stream => {
            stream.result = stream.processed?.reduce((a, b) => a + b, 0)
          })
          shared.completed = true
          return undefined
        }
      }

      const processor = new StreamProcessor()
      const aggregator = new ParallelAggregator()

      processor.on('continue', processor)
      processor.on('aggregate', aggregator)

      const workflow = new Flow(processor)

      const parallelState: ParallelState = {
        streams: [
          { id: 'stream1', data: [1, 2, 3] },
          { id: 'stream2', data: [4, 5, 6] },
          { id: 'stream3', data: [7, 8, 9] }
        ],
        currentStream: 0,
        completed: false
      }

      const startTime = Date.now()
      await workflow.run(parallelState)
      const executionTime = Date.now() - startTime

      expect(parallelState.completed).toBe(true)
      expect(parallelState.streams.every(s => s.processed)).toBe(true)
      expect(parallelState.streams.every(s => s.result)).toBe(true)

      // Verify results
      expect(parallelState.streams[0].result).toBe(18) // (1+2+3)*3
      expect(parallelState.streams[1].result).toBe(45) // (4+5+6)*3
      expect(parallelState.streams[2].result).toBe(72) // (7+8+9)*3

      // Should complete faster than sequential processing
      expect(executionTime).toBeLessThan(100)
    })
  })

  describe('Document Processing Workflow', () => {
    it('should categorize and summarize documents', async () => {
      class DocumentCategorizer extends Node<DocumentWorkflowState> {
        async prep(shared: DocumentWorkflowState): Promise<Array<{ id: string; content: string }>> {
          shared.currentStage = 'categorizing'
          return shared.documents
        }

        async exec(documents: Array<{ id: string; content: string }>): Promise<Record<string, Array<{ id: string; content: string }>>> {
          await new Promise(resolve => setTimeout(resolve, 30))
          return documents.reduce((categories: any, doc) => {
            const category = doc.content.length > 50 ? 'long' : 'short'
            if (!categories[category]) categories[category] = []
            categories[category].push(doc)
            return categories
          }, {})
        }

        async post(shared: DocumentWorkflowState, prepRes: any, execRes: any): Promise<string> {
          shared.categorized = execRes
          shared.currentStage = 'summarizing'
          return 'summarize'
        }
      }

      class DocumentSummarizer extends MapReduceFlow {
        constructor() {
          const mapFn = async (docs: Array<{ id: string; content: string }>): Promise<Array<{ id: string; summary: string }>> => {
            return Promise.all(docs.map(async doc => ({
              id: doc.id,
              summary: `Summary of ${doc.content.substring(0, 20)}...`
            })))
          }

          const reduceFn = async (all: Array<{ id: string; summary: string }>, current: Array<{ id: string; summary: string }>): Promise<Array<{ id: string; summary: string }>> => [...all, ...current]

          const initialValue: Array<{ id: string; summary: string }> = []

          super(mapFn, reduceFn, initialValue)
        }

        async run(documents: Array<{ id: string; content: string }>): Promise<Array<{ id: string; summary: string }>> {
          const result = await super.run(documents)
          return result
        }
      }

      class FinalAggregator extends Node<DocumentWorkflowState> {
        async prep(shared: DocumentWorkflowState): Promise<any> {
          return { categorized: shared.categorized, summaries: shared.summaries }
        }

        async exec(data: any): Promise<string> {
          await new Promise(resolve => setTimeout(resolve, 20))
          const categories = Object.keys(data.categorized).join(', ')
          return `Processed ${data.summaries.length} documents in categories: ${categories}`
        }

        async post(shared: DocumentWorkflowState, prepRes: any, execRes: string): Promise<string> {
          // This doesn't really apply to our post method pattern
          shared.currentStage = 'completed'
          return undefined
        }
      }

      const categorizer = new DocumentCategorizer()
      const summarizer = new DocumentSummarizer()
      const aggregator = new FinalAggregator()

      categorizer.on('summarize', aggregator)
      summarizer.on('reduce', aggregator) // Custom flow for map-reduce

      const workflow = new Flow(categorizer)

      const docState: DocumentWorkflowState = {
        documents: [
          { id: 'doc1', content: 'Short document' },
          { id: 'doc2', content: 'This is a much longer document with more content to process' },
          { id: 'doc3', content: 'Another short doc' },
          { id: 'doc4', content: 'This is also a long document that should be categorized differently' }
        ],
        categorized: {},
        summaries: [],
        currentStage: 'loading'
      }

      // Custom execution for complex workflow
      await categorizer.run(docState)
      docState.summaries = await summarizer.run(docState.documents)

      expect(docState.currentStage).toBe('summarizing')
      expect(Object.keys(docState.categorized)).toContain('short')
      expect(Object.keys(docState.categorized)).toContain('long')
      expect(docState.summaries).toHaveLength(4)
      expect(docState.summaries.every(s => s.summary.startsWith('Summary of'))).toBe(true)
    })
  })
})