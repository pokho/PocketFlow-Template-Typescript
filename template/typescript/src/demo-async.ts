import 'dotenv/config'
import { runAsyncExamples } from './examples/async-examples'
import { AsyncNode, AsyncFlow, createAsyncNode } from './async'
import { callLlm } from './utils/callLlm'
import * as fs from 'fs/promises'

// Demo-specific shared store interface
interface DemoSharedStore {
  user_question?: string
  llm_response?: string
  analysis_result?: string
  processing_time?: number
  error_info?: string
}

/**
 * Interactive Async Demo: User Question Processing
 */
class AsyncQuestionProcessor extends AsyncNode<DemoSharedStore> {
  async prep_async(shared: DemoSharedStore): Promise<string> {
    console.log('🤔 Preparing to process user question...')
    return shared.user_question || ''
  }

  async exec_async(question: string): Promise<string> {
    console.log('🤖 Calling LLM to answer question...')
    const startTime = Date.now()

    try {
      const response = await callLlm(question)
      const processingTime = Date.now() - startTime
      console.log(`⏱️ LLM response received in ${processingTime}ms`)
      return response
    } catch (error) {
      console.error('❌ LLM call failed:', error)
      throw error
    }
  }

  async post_async(shared: DemoSharedStore, prep_res: string, exec_res: string): Promise<string> {
    console.log('💾 Storing LLM response...')
    shared.llm_response = exec_res
    return 'analyze_response'
  }
}

/**
 * Async Response Analyzer
 */
class AsyncResponseAnalyzer extends AsyncNode<DemoSharedStore> {
  async prep_async(shared: DemoSharedStore): Promise<string> {
    console.log('🔍 Preparing to analyze LLM response...')
    return shared.llm_response || ''
  }

  async exec_async(response: string): Promise<string> {
    console.log('📊 Analyzing response quality and content...')

    const analysisPrompt = `
    Analyze this response for:
    1. Accuracy and completeness
    2. Clarity and structure
    3. Helpfulness to the user

    Response to analyze: "${response}"

    Provide a brief analysis (max 100 words).
    `

    return await callLlm(analysisPrompt)
  }

  async post_async(shared: DemoSharedStore, prep_res: string, exec_res: string): Promise<string> {
    console.log('📋 Storing analysis result...')
    shared.analysis_result = exec_res
    return undefined // End the workflow
  }
}

/**
 * Create a complete async demo workflow
 */
function createAsyncDemoWorkflow(): AsyncFlow<DemoSharedStore> {
  console.log('🏗️ Building async demo workflow...')

  // Create a simple input node (could be from user input, API, etc.)
  const inputNode = createAsyncNode<DemoSharedStore>({
    async prep_async(shared: DemoSharedStore): Promise<string> {
      return 'getting_started'
    },

    async exec_async(_: string): Promise<string> {
      // In a real app, this might get input from CLI, web interface, etc.
      const questions = [
        'What is artificial intelligence and how does it work?',
        'Explain the concept of machine learning in simple terms.',
        'What are the main differences between supervised and unsupervised learning?'
      ]

      const randomQuestion = questions[Math.floor(Math.random() * questions.length)]
      console.log(`\n🎤 Random Question Selected: "${randomQuestion}"\n`)

      return randomQuestion
    },

    async post_async(shared: DemoSharedStore, prep_res: string, exec_res: string): Promise<string> {
      shared.user_question = exec_res
      return 'process_question'
    }
  })

  // Create processing nodes
  const questionProcessor = new AsyncQuestionProcessor()
  const responseAnalyzer = new AsyncResponseAnalyzer()

  // Create a final output node
  const outputNode = createAsyncNode<DemoSharedStore>({
    async prep_async(shared: DemoSharedStore): Promise<any> {
      return {
        question: shared.user_question,
        response: shared.llm_response,
        analysis: shared.analysis_result
      }
    },

    async exec_async(data: any): Promise<string> {
      console.log('\n🎯 Generating final output...')
      return JSON.stringify(data, null, 2)
    },

    async post_async(shared: DemoSharedStore, prep_res: any, exec_res: string): Promise<string> {
      console.log('\n🏁 Demo Workflow Complete!')
      console.log('='.repeat(50))
      console.log(exec_res)
      console.log('='.repeat(50))
      return undefined
    }
  })

  // Connect the workflow
  inputNode
    .next(questionProcessor, 'process_question')
    .next(responseAnalyzer, 'analyze_response')
    .next(outputNode)

  return new AsyncFlow(inputNode)
}

/**
 * Demonstrate async file processing
 */
async function demonstrateAsyncFileProcessing(): Promise<void> {
  console.log('\n📁 Async File Processing Demo')
  console.log('='.repeat(40))

  try {
    // Create a sample file
    const sampleContent = `
    Artificial Intelligence (AI) is a rapidly evolving field that focuses on creating intelligent machines
    capable of performing tasks that typically require human intelligence. These tasks include learning,
    reasoning, problem-solving, perception, and language understanding.

    Machine Learning, a subset of AI, enables systems to learn and improve from experience without being
    explicitly programmed. It involves training algorithms on large datasets to recognize patterns and
    make predictions or decisions.

    Deep Learning, a further subset of Machine Learning, uses neural networks with multiple layers to
    process complex patterns in large amounts of data. This approach has led to breakthroughs in areas
    such as computer vision, natural language processing, and game playing.
    `

    await fs.writeFile('./temp-sample.txt', sampleContent, 'utf-8')
    console.log('📝 Created sample file for processing')

    // Create an async file processor
    const fileProcessor = createAsyncNode({
      async prep_async(): Promise<string> {
        console.log('📖 Reading file asynchronously...')
        return './temp-sample.txt'
      },

      async exec_async(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath, 'utf-8')
        console.log(`✅ Read file: ${content.length} characters`)
        return content
      },

      async post_async(shared: any, prep_res: string, exec_res: string): Promise<string> {
        console.log('📊 Processing file content...')
        return 'process_content'
      }
    })

    const contentProcessor = createAsyncNode({
      async prep_async(shared: any): Promise<string> {
        return shared.file_content || ''
      },

      async exec_async(content: string): Promise<string> {
        console.log('🔍 Analyzing content with LLM...')
        const prompt = `Extract the key topics from this text in bullet points:\n\n${content}`
        return await callLlm(prompt)
      },

      async post_async(shared: any, prep_res: string, exec_res: string): Promise<string> {
        console.log('📋 Content analysis complete!')
        console.log('\nKey Topics Found:')
        console.log(exec_res)
        return undefined
      }
    })

    // Connect and run
    fileProcessor.next(contentProcessor)
    const fileFlow = new AsyncFlow(fileProcessor)
    await fileFlow.run_async({})

    // Clean up
    await fs.unlink('./temp-sample.txt')
    console.log('🧹 Cleaned up temporary file')

  } catch (error) {
    console.error('❌ File processing demo failed:', error)
  }
}

/**
 * Main demo function
 */
async function runAsyncDemo(): Promise<void> {
  console.log('🚀 PocketFlow TypeScript Async Demo')
  console.log('====================================\n')

  try {
    // Demo 1: Interactive Question Processing
    console.log('📱 Demo 1: Async Question Processing Workflow')
    console.log('---------------------------------------------')

    const demoWorkflow = createAsyncDemoWorkflow()
    const sharedStore: DemoSharedStore = {
      processing_time: 0
    }

    const startTime = Date.now()
    await demoWorkflow.run_async(sharedStore)
    const totalTime = Date.now() - startTime

    console.log(`\n⏱️ Total workflow execution time: ${totalTime}ms`)

    // Demo 2: Async File Processing
    await demonstrateAsyncFileProcessing()

    // Demo 3: Run comprehensive examples
    console.log('\n🎪 Demo 3: Comprehensive Async Examples')
    console.log('----------------------------------------')
    await runAsyncExamples()

    console.log('\n🎉 All async demos completed successfully!')

  } catch (error) {
    console.error('\n❌ Demo failed:', error)

    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
  }
}

// Run the demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAsyncDemo().catch(console.error)
}

export { runAsyncDemo, createAsyncDemoWorkflow }