import { AsyncNode, AsyncFlow, AsyncBatchNode, AsyncBatchFlow, AsyncParallelBatchNode, createAsyncNode, createAsyncFlow } from '../async'
import { callLlm } from '../utils/callLlm'
import * as fs from 'fs/promises'
import * as path from 'path'

// Example shared store interfaces
interface DocumentProcessingSharedStore {
  documents?: string[]
  chunks?: string[]
  embeddings?: number[][]
  summaries?: string[]
  final_summary?: string
  user_feedback?: string
  processing_status?: string
}

interface MultiFileProcessingSharedStore {
  file_paths?: string[]
  file_results?: Record<string, any>
  combined_results?: any
}

interface ConcurrentProcessingSharedStore {
  urls?: string[]
  url_contents?: Record<string, string>
  processed_data?: any[]
}

/**
 * Example 1: Basic AsyncNode for LLM calls
 */
export class SummarizeTextAsyncNode extends AsyncNode<DocumentProcessingSharedStore> {
  async prep_async(shared: DocumentProcessingSharedStore): Promise<string> {
    console.log('📖 Reading text from shared store...')
    return shared.chunks?.[0] || ''
  }

  async exec_async(text: string): Promise<string> {
    console.log('🤖 Calling LLM to summarize text...')
    const prompt = `Please summarize this text in 2-3 sentences:\n\n${text}`
    return await callLlm(prompt)
  }

  async post_async(shared: DocumentProcessingSharedStore, prep_res: string, exec_res: string): Promise<string> {
    console.log('💾 Saving summary to shared store...')
    shared.summaries = shared.summaries || []
    shared.summaries.push(exec_res)
    return 'default'
  }
}

/**
 * Example 2: AsyncFileReader for I/O operations
 */
export class AsyncFileReaderNode extends AsyncNode<DocumentProcessingSharedStore> {
  private file_path: string

  constructor(file_path: string) {
    super()
    this.file_path = file_path
  }

  async prep_async(shared: DocumentProcessingSharedStore): Promise<string> {
    console.log(`📁 Reading file: ${this.file_path}`)
    return this.file_path
  }

  async exec_async(file_path: string): Promise<string> {
    try {
      const content = await fs.readFile(file_path, 'utf-8')
      console.log(`✅ Successfully read file (${content.length} characters)`)
      return content
    } catch (error) {
      console.error(`❌ Failed to read file: ${error}`)
      throw error
    }
  }

  async exec_fallback_async(file_path: string, error: Error): Promise<string> {
    console.log('🔄 Using fallback content due to file read error')
    return 'Default fallback content for processing.'
  }

  async post_async(shared: DocumentProcessingSharedStore, prep_res: string, exec_res: string): Promise<string> {
    console.log('📋 Storing document content...')
    shared.documents = shared.documents || []
    shared.documents.push(exec_res)
    shared.processing_status = 'file_read_complete'
    return 'chunk_document'
  }
}

/**
 * Example 3: AsyncTextChunker for document processing
 */
export class AsyncTextChunkerNode extends AsyncNode<DocumentProcessingSharedStore> {
  async prep_async(shared: DocumentProcessingSharedStore): Promise<string> {
    console.log('✂️ Preparing to chunk document...')
    return shared.documents?.[0] || ''
  }

  async exec_async(document: string): Promise<string[]> {
    console.log('🔪 Chunking document into smaller pieces...')
    const chunk_size = 1000
    const chunks: string[] = []

    for (let i = 0; i < document.length; i += chunk_size) {
      chunks.push(document.slice(i, i + chunk_size))
    }

    console.log(`📦 Created ${chunks.length} chunks`)
    return chunks
  }

  async post_async(shared: DocumentProcessingSharedStore, prep_res: string, exec_res: string[]): Promise<string> {
    console.log('💾 Storing chunks in shared store...')
    shared.chunks = exec_res
    shared.processing_status = 'chunking_complete'
    return 'summarize_chunks'
  }
}

/**
 * Example 4: AsyncUserFeedback for interactive workflows
 */
export class AsyncUserFeedbackNode extends AsyncNode<DocumentProcessingSharedStore> {
  async prep_async(shared: DocumentProcessingSharedStore): Promise<string> {
    return shared.summaries?.[0] || ''
  }

  async exec_async(summary: string): Promise<string> {
    console.log('👤 Waiting for user feedback...')
    console.log(`\nGenerated Summary:\n${summary}\n`)

    // Simulate async user feedback (in real app, this could be a web interface)
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('⏰ User feedback received!')
        resolve('User approved the summary')
      }, 2000)
    })
  }

  async post_async(shared: DocumentProcessingSharedStore, prep_res: string, exec_res: string): Promise<string> {
    console.log('📝 Storing user feedback...')
    shared.user_feedback = exec_res
    shared.processing_status = 'feedback_received'
    return 'finalize'
  }
}

/**
 * Example 5: AsyncBatchNode for processing multiple chunks
 */
export class AsyncSummarizeBatchNode extends AsyncBatchNode<DocumentProcessingSharedStore> {
  async prep_async(shared: DocumentProcessingSharedStore): Promise<string[]> {
    console.log('🔄 Preparing batch processing for chunks...')
    return shared.chunks || []
  }

  async process_item_async(chunk: string): Promise<string> {
    console.log('📝 Processing chunk...')
    const prompt = `Summarize this chunk in 1 sentence:\n\n${chunk}`
    return await callLlm(prompt)
  }

  async post_async(shared: DocumentProcessingSharedStore, prep_res: string[], exec_res: string[]): Promise<string> {
    console.log(`✅ Batch processing complete. Generated ${exec_res.length} summaries`)
    shared.summaries = exec_res
    shared.processing_status = 'batch_summarization_complete'
    return 'combine_summaries'
  }
}

/**
 * Example 6: AsyncParallelBatchNode for concurrent URL processing
 */
export class AsyncUrlProcessorNode extends AsyncParallelBatchNode<ConcurrentProcessingSharedStore> {
  constructor() {
    super(3) // Process 3 URLs concurrently
  }

  async prep_async(shared: ConcurrentProcessingSharedStore): Promise<string[]> {
    console.log('🌐 Preparing to process URLs concurrently...')
    return shared.urls || []
  }

  async process_item_async(url: string): Promise<{url: string, content: string}> {
    console.log(`🔍 Fetching content from: ${url}`)

    // Simulate async URL fetching
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000))

    // Simulate different response times and potential failures
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Failed to fetch ${url}`)
    }

    return {
      url,
      content: `Mock content for ${url} (${Math.floor(Math.random() * 1000)} words)`
    }
  }

  async post_async(shared: ConcurrentProcessingSharedStore, prep_res: string[], exec_res: any[]): Promise<string> {
    console.log(`✅ Concurrent processing complete. Processed ${exec_res.length} URLs`)

    // Store successful results
    const url_contents: Record<string, string> = {}
    exec_res.forEach(result => {
      if (result && result.url) {
        url_contents[result.url] = result.content
      }
    })

    shared.url_contents = url_contents
    return 'default'
  }
}

/**
 * Example 7: AsyncBatchFlow for processing multiple files
 */
export class AsyncMultiFileProcessorFlow extends AsyncBatchFlow<MultiFileProcessingSharedStore> {
  async prep_async(shared: MultiFileProcessingSharedStore): Promise<Record<string, any>[]> {
    console.log('📁 Preparing to process multiple files...')
    const file_paths = shared.file_paths || []

    return file_paths.map(file_path => ({
      file_path,
      processing_id: Math.random().toString(36).substr(2, 9)
    }))
  }

  create_flow_instance(params: Record<string, any>): AsyncFlow<MultiFileProcessingSharedStore> {
    console.log(`🔄 Creating flow instance for file: ${params.file_path}`)

    // Create nodes for this file
    const fileReader = new AsyncFileReaderNode(params.file_path)
    const summarizer = new SummarizeTextAsyncNode()

    // Connect nodes
    fileReader.next(summarizer)

    // Create and return the flow
    return new AsyncFlow(fileReader)
  }

  async exec_async(prep_res: Record<string, any>[]): Promise<void> {
    console.log(`🚀 Starting batch processing of ${prep_res.length} files...`)

    for (const params of prep_res) {
      try {
        console.log(`\n--- Processing file: ${params.file_path} ---`)
        const flow_instance = this.create_flow_instance(params)

        // Create a shared store for this specific file
        const file_shared: MultiFileProcessingSharedStore = {
          file_results: this.shared?.file_results || {}
        }

        await flow_instance.run_async(file_shared)

        console.log(`✅ Completed processing: ${params.file_path}`)

      } catch (error) {
        console.error(`❌ Failed to process file ${params.file_path}:`, error)
      }
    }

    console.log('\n🎉 All files processed!')
  }
}

/**
 * Example 8: Complex AsyncFlow with multiple branches
 */
export function createComplexAsyncWorkflow(): AsyncFlow<DocumentProcessingSharedStore> {
  console.log('🏗️ Building complex async workflow...')

  // Create nodes
  const fileReader = new AsyncFileReaderNode('./example-document.txt')
  const textChunker = new AsyncTextChunkerNode()
  const batchSummarizer = new AsyncSummarizeBatchNode()
  const userFeedback = new AsyncUserFeedbackNode()
  const finalizer = createAsyncNode<DocumentProcessingSharedStore>({
    async prep_async(shared: DocumentProcessingSharedStore): Promise<any> {
      return {
        summaries: shared.summaries || [],
        feedback: shared.user_feedback || ''
      }
    },

    async exec_async(data: any): Promise<string> {
      console.log('🎯 Creating final summary...')
      const all_summaries = data.summaries.join('\n\n')
      const prompt = `Create a comprehensive final summary from these partial summaries:\n\n${all_summaries}`
      return await callLlm(prompt)
    },

    async post_async(shared: DocumentProcessingSharedStore, prep_res: any, exec_res: string): Promise<string> {
      console.log('🏁 Workflow complete!')
      shared.final_summary = exec_res
      shared.processing_status = 'complete'
      return undefined // End workflow
    }
  })

  // Define workflow connections
  fileReader
    .next(textChunker, 'chunk_document')
    .next(batchSummarizer, 'summarize_chunks')
    .next(userFeedback, 'request_feedback')
    .next(finalizer, 'finalize')

  // Create and return the async flow
  return new AsyncFlow(fileReader)
}

/**
 * Example 9: Error handling and retry logic
 */
export class RobustAsyncNode extends AsyncNode<DocumentProcessingSharedStore> {
  constructor() {
    super()
    this.max_retries = 3
    this.wait = 2 // 2 seconds between retries
  }

  async prep_async(shared: DocumentProcessingSharedStore): Promise<string> {
    return shared.chunks?.[0] || ''
  }

  async exec_async(text: string): Promise<string> {
    console.log('🔄 Attempting operation (may fail)...')

    // Simulate operation that might fail
    if (Math.random() < 0.6) { // 60% failure rate
      throw new Error('Simulated operation failure')
    }

    return 'Operation succeeded!'
  }

  async exec_fallback_async(prep_res: string, error: Error): Promise<string> {
    console.log('🛡️ Using fallback due to repeated failures')
    return 'Fallback result: Operation could not be completed, but we continued anyway.'
  }

  async post_async(shared: DocumentProcessingSharedStore, prep_res: string, exec_res: string): Promise<string> {
    console.log('📊 Operation result:', exec_res)
    shared.processing_status = 'robust_operation_complete'
    return 'default'
  }
}

/**
 * Main function to demonstrate all async examples
 */
export async function runAsyncExamples(): Promise<void> {
  console.log('🚀 Starting Async PocketFlow Examples...\n')

  try {
    // Example 1: Basic async workflow
    console.log('=== Example 1: Basic Async Workflow ===')
    const basicFlow = createComplexAsyncWorkflow()
    const basicShared: DocumentProcessingSharedStore = {}
    await basicFlow.run_async(basicShared)
    console.log('Result:', basicShared.final_summary)
    console.log('\n')

    // Example 2: Concurrent URL processing
    console.log('=== Example 2: Concurrent URL Processing ===')
    const urlProcessor = new AsyncUrlProcessorNode()
    const urlShared: ConcurrentProcessingSharedStore = {
      urls: [
        'https://api.example1.com/data',
        'https://api.example2.com/data',
        'https://api.example3.com/data',
        'https://api.example4.com/data',
        'https://api.example5.com/data'
      ]
    }
    await urlProcessor.run_async(urlShared)
    console.log('Processed URLs:', Object.keys(urlShared.url_contents || {}))
    console.log('\n')

    // Example 3: Robust error handling
    console.log('=== Example 3: Robust Error Handling ===')
    const robustNode = new RobustAsyncNode()
    const robustShared: DocumentProcessingSharedStore = {
      chunks: ['Sample text for robust processing']
    }
    await robustNode.run_async(robustShared)
    console.log('Final status:', robustShared.processing_status)
    console.log('\n')

  } catch (error) {
    console.error('❌ Example execution failed:', error)
  }
}

// Export all examples for easy importing
export {
  SummarizeTextAsyncNode,
  AsyncFileReaderNode,
  AsyncTextChunkerNode,
  AsyncUserFeedbackNode,
  AsyncSummarizeBatchNode,
  AsyncUrlProcessorNode,
  AsyncMultiFileProcessorFlow,
  RobustAsyncNode,
  createComplexAsyncWorkflow
}