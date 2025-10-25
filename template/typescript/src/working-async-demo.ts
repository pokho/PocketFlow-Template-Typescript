import 'dotenv/config'
import { Node, Flow } from 'pocketflow'
import { callLlm } from './utils/callLlm'

interface DemoSharedStore {
  question?: string
  answer?: string
  status?: string
}

/**
 * Simple Async Node - uses async methods with PocketFlow Node
 */
class SimpleAsyncNode extends Node<DemoSharedStore> {
  async prep(shared: DemoSharedStore): Promise<string> {
    console.log('🤔 Getting question...')
    return shared.question || 'What is async programming?'
  }

  async exec(question: string): Promise<string> {
    console.log('🤖 Calling LLM...')
    console.log(`Question: "${question}"`)

    try {
      const answer = await callLlm(`Briefly answer: ${question}`)
      console.log('✅ Got response from LLM')
      return answer
    } catch (error) {
      console.error('❌ LLM call failed')
      throw error
    }
  }

  async post(shared: DemoSharedStore, prepRes: string, execRes: string): Promise<string | undefined> {
    console.log('💾 Storing result...')
    shared.answer = execRes
    shared.status = 'complete'
    return undefined // End workflow
  }
}

/**
 * Run a simple async workflow
 */
async function runWorkingAsyncDemo(): Promise<void> {
  console.log('🚀 Working PocketFlow Async Demo')
  console.log('===============================\n')

  try {
    // Create nodes
    const questionNode = new SimpleAsyncNode()

    // Create flow
    const workflow = new Flow(questionNode)

    // Initialize shared store
    const sharedStore: DemoSharedStore = {
      question: 'Explain async/await in JavaScript in one sentence.'
    }

    console.log('📋 Question:', sharedStore.question)
    console.log('⏳ Processing...\n')

    // Run the workflow
    await workflow.run(sharedStore)

    console.log('\n🎉 Results:')
    console.log('=========')
    console.log('Status:', sharedStore.status)
    console.log('Answer:', sharedStore.answer)
    console.log('\n✅ Async demo completed successfully!')

  } catch (error) {
    console.error('\n❌ Demo failed:', error)
  }
}

// Run the demo
if (require.main === module) {
  runWorkingAsyncDemo().catch(console.error)
}

export { runWorkingAsyncDemo, SimpleAsyncNode }