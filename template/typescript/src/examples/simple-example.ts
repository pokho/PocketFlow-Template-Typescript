import { Node, Flow } from 'pocketflow'

// Define interface for shared state
interface SharedState {
  question: string
  answer?: string
}

// Example LLM utility function
async function callLLM(prompt: string): Promise<string> {
  // Mock LLM response for demonstration
  console.log(`Calling LLM with prompt: "${prompt}"`)
  await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API call
  return `I processed: ${prompt}`
}

// Simple example node
class QuestionProcessor extends Node<SharedState> {
  async prep(shared: SharedState): Promise<string> {
    return shared.question || 'What is the meaning of life?'
  }

  async exec(question: string): Promise<string> {
    return await callLLM(question)
  }

  async post(shared: SharedState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.answer = execRes
    console.log(`Answer: ${execRes}`)
    return undefined // End workflow
  }
}

// Main execution
async function main(): Promise<void> {
  console.log('🚀 PocketFlow TypeScript Example')
  console.log('==================================')

  const questionNode = new QuestionProcessor()
  const flow = new Flow(questionNode)

  const shared: SharedState = {
    question: 'How does PocketFlow work?'
  }

  try {
    await flow.run(shared)
    console.log('\n✅ Workflow completed successfully!')
    console.log(`Final answer: ${shared.answer}`)
  } catch (error) {
    console.error('\n❌ Workflow failed:', error)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { main, QuestionProcessor }