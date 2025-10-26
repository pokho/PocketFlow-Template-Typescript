import { Node, Flow } from 'pocketflow'
import {
  EnhancedBatchFlow,
  EnhancedBatchNode,
  createEnhancedBatchFlow,
  createEnhancedBatchNode
} from '../enhancements/enhanced-batch-flow'
import {
  MapReduceFlow,
  WordCountFlow,
  BatchMapReduceFlow,
  createMapReduceFlow,
  createWordCountFlow,
  createBatchMapReduceFlow
} from '../enhancements/map-reduce-patterns'

// Mock LLM and processing functions
async function mockLLM(text: string): Promise<string> {
  console.log(`🤖 Processing: ${text.substring(0, 40)}...`)
  await new Promise(resolve => setTimeout(resolve, 50))
  return `Summary: ${text.substring(0, 30)}...`
}

async function mockDocumentAnalysis(doc: { content: string }): Promise<{
  summary: string
  keywords: string[]
  sentiment: number
}> {
  await new Promise(resolve => setTimeout(resolve, 30))
  const words = doc.content.split(' ').length
  const keywords = doc.content
    .split(' ')
    .filter(w => w.length > 5)
    .slice(0, 3)
  return {
    summary: `Document summary (${words} words)`,
    keywords,
    sentiment: Math.random() * 2 - 1 // -1 to 1
  }
}

// Example 1: Enhanced Batch Processing
async function demonstrateEnhancedBatchProcessing(): Promise<void> {
  console.log('\n🚀 Enhanced Batch Processing Demo')
  console.log('================================')

  // Document processing batch node
  class DocumentBatchProcessor extends EnhancedBatchNode<{
    documents: Array<{ id: string; content: string; analysis?: any }>
    processedCount?: number
    totalAnalysisTime?: number
  }> {
    protected getInputItems(shared: any): any[] {
      return shared.documents
    }

    protected async processItem(doc: { id: string; content: string }): Promise<any> {
      return await mockDocumentAnalysis(doc)
    }

    async post(
      shared: any,
      prepRes: any,
      execRes: any[]
    ): Promise<string | undefined> {
      shared.processedCount = execRes.length
      shared.documents.forEach((doc: any, index: number) => {
        doc.analysis = execRes[index]
      })
      return undefined
    }
  }

  const documents = Array.from({ length: 10 }, (_, i) => ({
    id: `doc_${i + 1}`,
    content: `This is document ${i + 1}. It contains various information about topic ${i % 3 + 1}. `.repeat(10)
  }))

  const batchNode = new DocumentBatchProcessor()
  const batchFlow = new EnhancedBatchFlow(batchNode, { maxConcurrency: 3 })

  const startTime = Date.now()
  await batchFlow.run({ documents })
  const executionTime = Date.now() - startTime

  console.log(`✅ Processed ${documents.length} documents in ${executionTime}ms`)
  console.log(`📊 Processing concurrency: 3 documents at a time`)

  // Show batch metrics
  const batchStats = batchNode.getBatchStats()
  console.log('\n📈 Batch Statistics:')
  console.log(`  Total Items: ${batchStats.totalItems}`)
  console.log(`  Success Rate: ${((batchStats.successCount / batchStats.totalItems) * 100).toFixed(1)}%`)
  console.log(`  Average Time: ${batchStats.averageExecutionTime.toFixed(1)}ms per item`)

  // Show sample results
  console.log('\n📄 Sample Analysis Results:')
  documents.slice(0, 3).forEach(doc => {
    console.log(`  ${doc.id}: ${(doc as any).analysis?.summary}`)
    console.log(`    Keywords: ${(doc as any).analysis?.keywords?.join(', ')}`)
    console.log(`    Sentiment: ${(doc as any).analysis?.sentiment?.toFixed(2)}`)
  })
}

// Example 2: Map-Reduce Pattern
async function demonstrateMapReduce(): Promise<void> {
  console.log('\n🗺️  Map-Reduce Pattern Demo')
  console.log('===========================')

  // Text analysis example
  const texts = [
    'The quick brown fox jumps over the lazy dog',
    'A journey of a thousand miles begins with a single step',
    'To be or not to be that is the question',
    'All that glitters is not gold',
    'Where there is a will there is a way'
  ]

  // Create map-reduce flow for word frequency analysis
  const wordCountFlow = createWordCountFlow()

  console.log('📝 Analyzing texts for word frequency...')
  const startTime = Date.now()
  const wordCounts = await wordCountFlow.run(texts)
  const executionTime = Date.now() - startTime

  console.log(`✅ Analysis completed in ${executionTime}ms`)
  console.log(`📊 Found ${Object.keys(wordCounts).length} unique words`)

  // Show top words
  const sortedWords = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  console.log('\n🔤 Top 10 Most Frequent Words:')
  sortedWords.forEach(([word, count], index) => {
    console.log(`  ${index + 1}. "${word}": ${count}`)
  })

  // Custom map-reduce example
  console.log('\n📐 Custom Map-Reduce Example (Text Length Analysis):')

  const lengthAnalysisFlow = createMapReduceFlow(
    // Map function: calculate text lengths
    async (text: string): Promise<{ text: string; length: number; wordCount: number }> => {
      const words = text.split(/\s+/).filter(w => w.length > 0)
      return {
        text: text.substring(0, 30) + '...',
        length: text.length,
        wordCount: words.length
      }
    },
    // Reduce function: find longest text
    async (longest: any, current: any): Promise<any> => {
      return current.length > longest.length ? current : longest
    },
    // Initial value
    { text: '', length: 0, wordCount: 0 }
  )

  const longestText = await lengthAnalysisFlow.run(texts)
  console.log(`  Longest text: "${longestText.text}"`)
  console.log(`  Length: ${longestText.length} characters, ${longestText.wordCount} words`)
}

// Example 3: Advanced Batch Map-Reduce
async function demonstrateBatchMapReduce(): Promise<void> {
  console.log('\n🔄 Advanced Batch Map-Reduce Demo')
  console.log('===============================')

  // Simple number aggregation example
  const numbers = Array.from({ length: 50 }, (_, i) => i + 1)

  const sumFlow = createMapReduceFlow(
    // Map function: identity (just pass through)
    async (num: number): Promise<number> => {
      await new Promise(resolve => setTimeout(resolve, 1))
      return num
    },
    // Reduce function: sum all numbers
    async (sum: number, current: number): Promise<number> => sum + current,
    // Initial value
    0
  )

  console.log('📊 Processing 50 numbers with map-reduce...')
  const startTime = Date.now()
  const result = await sumFlow.run(numbers)
  const executionTime = Date.now() - startTime

  console.log(`✅ Map-reduce completed in ${executionTime}ms`)
  console.log(`📈 Sum of numbers 1-50: ${result}`)

  // Average calculation
  const avgFlow = createMapReduceFlow(
    // Map function: identity
    async (num: number): Promise<number> => num,
    // Reduce function: running average
    async (acc: { sum: number; count: number }, current: number): Promise<{ sum: number; count: number }> => ({
      sum: acc.sum + current,
      count: acc.count + 1
    }),
    // Initial value
    { sum: 0, count: 0 }
  )

  const avgResult = await avgFlow.run(numbers)
  const average = avgResult.sum / avgResult.count
  console.log(`📊 Average of numbers 1-50: ${average.toFixed(2)}`)
}

// Example 4: Workflow Pattern Integration
async function demonstrateWorkflowIntegration(): Promise<void> {
  console.log('\n🔄 Workflow Integration Demo')
  console.log('============================')

  interface WorkflowState {
    data: any[]
    processed: any[]
    aggregated: any
    report?: string
    stage: 'loading' | 'processing' | 'aggregating' | 'reporting' | 'completed'
  }

  // Data loading node
  class DataLoaderNode extends Node<WorkflowState> {
    async prep(shared: WorkflowState): Promise<number> {
      shared.stage = 'loading'
      return 50 // Load 50 items
    }

    async exec(count: number): Promise<any[]> {
      await new Promise(resolve => setTimeout(resolve, 100))
      return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        value: Math.floor(Math.random() * 100),
        timestamp: Date.now() + i * 1000
      }))
    }

    async post(shared: WorkflowState, prepRes: any, execRes: any[]): Promise<string> {
      shared.data = execRes
      shared.stage = 'processing'
      return 'process'
    }
  }

  // Batch processing node
  class BatchProcessNode extends EnhancedBatchNode<WorkflowState> {
    protected getInputItems(shared: WorkflowState): any[] {
      return shared.data
    }

    protected async processItem(item: any): Promise<any> {
      await new Promise(resolve => setTimeout(resolve, 20))
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

  // Aggregation node
  class AggregationNode extends Node<WorkflowState> {
    async prep(shared: WorkflowState): Promise<any[]> {
      return shared.processed
    }

    async exec(items: any[]): Promise<any> {
      await new Promise(resolve => setTimeout(resolve, 50))
      const categoryGroups = items.reduce((groups: any, item) => {
        const cat = item.category
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(item)
        return groups
      }, {})

      return Object.entries(categoryGroups).map(([cat, items]: [string, any]) => ({
        category: cat,
        count: items.length,
        totalValue: items.reduce((sum: number, item: any) => sum + item.processedValue, 0),
        avgValue: items.reduce((sum: number, item: any) => sum + item.processedValue, 0) / items.length
      }))
    }

    async post(shared: WorkflowState, prepRes: any, execRes: any): Promise<string> {
      shared.aggregated = execRes
      shared.stage = 'reporting'
      return 'report'
    }
  }

  // Report generation node
  class ReportNode extends Node<WorkflowState> {
    async prep(shared: WorkflowState): Promise<any> {
      return shared.aggregated
    }

    async exec(data: any): Promise<string> {
      await new Promise(resolve => setTimeout(resolve, 30))
      const report = `
Workflow Execution Report
========================
Total Categories: ${data.length}
${data.map((cat: any) =>
  `Category ${cat.category}: ${cat.count} items, avg value: ${cat.avgValue.toFixed(1)}`
).join('\n')}
Generated at: ${new Date().toISOString()}
      `.trim()
      return report
    }

    async post(shared: WorkflowState, prepRes: any, execRes: string): Promise<string | undefined> {
      shared.report = execRes
      shared.stage = 'completed'
      return undefined
    }
  }

  // Create workflow
  const loader = new DataLoaderNode()
  const processor = new BatchProcessNode()
  const aggregator = new AggregationNode()
  const reporter = new ReportNode()

  loader.on('process', processor)
  processor.on('aggregate', aggregator)
  aggregator.on('report', reporter)

  const workflow = new Flow(loader)

  console.log('🔄 Running integrated workflow...')
  const startTime = Date.now()

  const initialState: WorkflowState = {
    data: [],
    processed: [],
    aggregated: undefined,
    stage: 'loading'
  }

  await workflow.run(initialState)
  const totalTime = Date.now() - startTime

  console.log(`✅ Workflow completed in ${totalTime}ms`)
  console.log(`📊 Final Stage: ${initialState.stage}`)
  console.log(`📋 Data Points: ${initialState.data.length} → ${initialState.processed.length} → ${initialState.aggregated.length} categories`)

  if (initialState.report) {
    console.log('\n📄 Generated Report:')
    console.log(initialState.report)
  }
}

// Main execution function
async function runPhase2Examples(): Promise<void> {
  console.log('🎯 Phase 2 Advanced Examples - Enhanced PocketFlow TypeScript')
  console.log('=====================================================')

  try {
    await demonstrateEnhancedBatchProcessing()
    await demonstrateMapReduce()
    await demonstrateBatchMapReduce()
    await demonstrateWorkflowIntegration()

    console.log('\n🎉 All Phase 2 examples completed successfully!')
  } catch (error) {
    console.error('\n❌ Error in examples:', error)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runPhase2Examples().catch(console.error)
}

export {
  runPhase2Examples,
  demonstrateEnhancedBatchProcessing,
  demonstrateMapReduce,
  demonstrateBatchMapReduce,
  demonstrateWorkflowIntegration
}