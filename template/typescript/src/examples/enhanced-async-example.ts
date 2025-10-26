import { Node, Flow } from 'pocketflow'
import { EnhancedAsyncNode, EnhancedAsyncFlow } from '../enhancements'

// Example interface
interface DocumentProcessingState {
  documents: Array<{ id: string; content: string; summary?: string }>
  currentDoc?: string
  finalReport?: string
  completed?: boolean
}

// Mock LLM function
async function mockLLM(prompt: string): Promise<string> {
  console.log(`🤖 Processing: ${prompt.substring(0, 50)}...`)
  await new Promise(resolve => setTimeout(resolve, 100)) // Simulate API call
  return `Summary: ${prompt.substring(0, 30)}... [processed]`
}

// Enhanced document processing node
class DocumentProcessorNode extends EnhancedAsyncNode<DocumentProcessingState> {
  async prep(shared: DocumentProcessingState): Promise<{ id: string; content: string } | null> {
    const doc = shared.documents.find(d => !d.summary)
    if (doc) {
      shared.currentDoc = doc.id
      return { id: doc.id, content: doc.content }
    }
    return null
  }

  protected async processAsync(doc: { id: string; content: string } | null): Promise<string | null> {
    if (!doc) return null
    return await mockLLM(`Summarize: ${doc.content}`)
  }

  async post(shared: DocumentProcessingState, prepRes: any, execRes: string | null): Promise<string | undefined> {
    if (shared.currentDoc && execRes) {
      const doc = shared.documents.find(d => d.id === shared.currentDoc)
      if (doc) {
        doc.summary = execRes
        console.log(`✅ Processed document ${shared.currentDoc}`)
      }
    }

    const hasUnprocessed = shared.documents.some(d => !d.summary)
    return hasUnprocessed ? 'continue' : 'report'
  }
}

// Report generation node
class ReportGeneratorNode extends Node<DocumentProcessingState> {
  async prep(shared: DocumentProcessingState): Promise<string> {
    const summaries = shared.documents
      .filter(d => d.summary)
      .map(d => `Doc ${d.id}: ${d.summary}`)
      .join('\n')
    return summaries
  }

  async exec(summaries: string): Promise<string> {
    return await mockLLM(`Generate final report:\n${summaries}`)
  }

  async post(shared: DocumentProcessingState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.finalReport = execRes
    shared.completed = true
    return undefined
  }
}

// Main execution function
async function demonstrateEnhancedAsync(): Promise<void> {
  console.log('🚀 Enhanced PocketFlow TypeScript Demo')
  console.log('=====================================\n')

  // Setup initial state
  const state: DocumentProcessingState = {
    documents: [
      {
        id: 'doc1',
        content: 'Artificial Intelligence is transforming how we interact with technology. Machine learning algorithms are becoming increasingly sophisticated, enabling computers to learn from data and make predictions. This revolution is impacting various industries including healthcare, finance, and transportation.'
      },
      {
        id: 'doc2',
        content: 'Climate change represents one of the most pressing challenges of our time. Rising global temperatures, extreme weather events, and environmental degradation require immediate action. Renewable energy sources and sustainable practices are essential for mitigating these effects.'
      },
      {
        id: 'doc3',
        content: 'The future of work is being reshaped by automation and digital transformation. Remote work has become more prevalent, and new skills are in demand. Lifelong learning and adaptability are crucial for career success in this evolving landscape.'
      }
    ]
  }

  // Create enhanced async flow
  const processorNode = new DocumentProcessorNode()
  const reportNode = new ReportGeneratorNode()

  // Connect nodes with self-loop for batch processing
  processorNode.on('continue', processorNode) // Self-loop for multiple documents
  processorNode.on('report', reportNode) // Transition to report generation

  const enhancedFlow = new EnhancedAsyncFlow(processorNode)

  console.log('📚 Processing documents...\n')

  const startTime = Date.now()
  await enhancedFlow.run(state)
  const executionTime = Date.now() - startTime

  // Display results
  console.log('\n📊 Results:')
  console.log('=============')
  console.log(`✅ Processed ${state.documents.filter(d => d.summary).length} documents`)
  console.log(`⏱️  Total execution time: ${executionTime}ms`)

  console.log('\n📄 Document Summaries:')
  state.documents.forEach(doc => {
    if (doc.summary) {
      console.log(`  ${doc.id}: ${doc.summary}`)
    }
  })

  if (state.finalReport) {
    console.log('\n📋 Final Report:')
    console.log(state.finalReport)
  }

  // Show performance metrics
  console.log('\n📈 Performance Metrics:')
  console.log('=====================')
  const flowMetrics = enhancedFlow.getFlowMetrics()
  flowMetrics.forEach((metric, index) => {
    console.log(`  Flow ${index + 1}:`)
    console.log(`    Success: ${metric.success}`)
    console.log(`    Time: ${metric.executionTime}ms`)
    console.log(`    Nodes: ${metric.nodeCount}`)
  })

  // Show node performance metrics
  console.log('\n🔧 Node Metrics:')
  console.log('===============')
  const nodeMetrics = processorNode.getMetrics()
  nodeMetrics.forEach((metric, index) => {
    console.log(`  Execution ${index + 1}:`)
    console.log(`    Success: ${metric.success}`)
    console.log(`    Time: ${metric.executionTime}ms`)
    if (!metric.success) {
      console.log(`    Error: ${metric.error?.message}`)
    }
  })

  console.log('\n🎉 Demo completed successfully!')
}

// Run if this file is executed directly
if (require.main === module) {
  demonstrateEnhancedAsync().catch(console.error)
}

export { demonstrateEnhancedAsync, DocumentProcessorNode, ReportGeneratorNode }