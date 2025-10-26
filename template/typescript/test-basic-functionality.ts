import { Node, Flow, BatchNode, BatchFlow } from 'pocketflow'

// Test interfaces
interface TestSharedStore {
  input?: string
  output?: string
  counter?: number
  errors?: string[]
  results?: any[]
  outline?: string
  content?: string
}

interface BatchTestStore {
  items?: string[]
  processed?: any[]
  errors?: string[]
}

/**
 * Test Basic Node functionality
 */
class TestNode extends Node<TestSharedStore> {
  constructor(private action: string = 'default') {
    super()
  }

  async prep(shared: TestSharedStore): Promise<string> {
    console.log(`TestNode.prep() called with:`, shared)
    return shared.input || `test_input_${this.action}`
  }

  async exec(prep_res: string): Promise<string> {
    console.log(`TestNode.exec() called with:`, prep_res)
    return `${prep_res}_processed_by_${this.action}`
  }

  async post(shared: TestSharedStore, prep_res: string, exec_res: string): Promise<string> {
    console.log(`TestNode.post() called with:`, { shared, prep_res, exec_res })
    shared.output = exec_res
    shared.counter = (shared.counter || 0) + 1
    return 'default'
  }
}

/**
 * Test Batch Node functionality
 */
class TestBatchNode extends BatchNode {
  async prep(shared: BatchTestStore): Promise<string[]> {
    console.log(`TestBatchNode.prep() called with:`, shared)
    return shared.items || ['item1', 'item2', 'item3']
  }

  async exec(item: string): Promise<string> {
    console.log(`TestBatchNode.exec() called with item:`, item)
    return `${item}_processed`
  }

  async post(shared: BatchTestStore, prep_res: string[], exec_res: string[]): Promise<string> {
    console.log(`TestBatchNode.post() called with:`, { prep_res, exec_res })
    shared.processed = exec_res
    return 'default'
  }
}

/**
 * Test Error Handling and Retry Logic
 */
class TestErrorNode extends Node<TestSharedStore> {
  private fail_count: number = 0
  private max_failures: number

  constructor(max_failures: number = 2, maxRetries: number = 3) {
    super(maxRetries, 0.1) // 100ms wait
    this.max_failures = max_failures
  }

  async prep(shared: TestSharedStore): Promise<string> {
    return shared.input || 'test_input'
  }

  async exec(prep_res: string): Promise<string> {
    this.fail_count++
    console.log(`TestErrorNode.exec() attempt ${this.fail_count}/${this.max_failures + 1}`)

    if (this.fail_count <= this.max_failures) {
      throw new Error(`Simulated failure ${this.fail_count}`)
    }

    return `${prep_res}_success_after_${this.fail_count - 1}_failures`
  }

  async execFallback(prep_res: string, error: Error): Promise<string> {
    console.log(`TestErrorNode.execFallback() called with error:`, error.message)
    return `${prep_res}_fallback_result`
  }
}

/**
 * Test Conditional Transitions
 */
class TestConditionalNode extends Node<TestSharedStore> {
  constructor(private action: string = 'default') {
    super()
  }

  async prep(shared: TestSharedStore): Promise<string> {
    return shared.input || 'test_input'
  }

  async exec(prep_res: string): Promise<string> {
    return `${prep_res}_processed`
  }

  async post(shared: TestSharedStore, prep_res: string, exec_res: string): Promise<string> {
    shared.output = exec_res
    // Return different actions to test conditional transitions
    if (shared.counter && shared.counter > 2) {
      return 'end'
    } else if (shared.counter && shared.counter % 2 === 0) {
      return 'branch_a'
    } else {
      return 'branch_b'
    }
  }
}

// Test Functions
async function testBasicNodeCreation(): Promise<void> {
  console.log('\n=== Testing Basic Node Creation ===')

  const node = new TestNode('basic_test')
  const shared: TestSharedStore = { input: 'hello_world' }

  console.log('Created TestNode successfully')
  console.log('Node maxRetries:', node.maxRetries)
  console.log('Node wait:', node.wait)

  const result = await node.run(shared)
  console.log('Node execution result:', result)
  console.log('Shared state after execution:', shared)
}

async function testFlowCreation(): Promise<void> {
  console.log('\n=== Testing Flow Creation ===')

  const node1 = new TestNode('flow_test_1')
  const node2 = new TestNode('flow_test_2')
  const node3 = new TestNode('flow_test_3')

  // Test node connections: node1 >> node2 >> node3
  node1.next(node2)
  node2.next(node3)

  const flow = new Flow(node1)
  const shared: TestSharedStore = { input: 'flow_input', counter: 0 }

  console.log('Created Flow with 3 nodes')
  console.log('Running flow...')

  await flow.run(shared)

  console.log('Flow execution completed')
  console.log('Final shared state:', shared)
}

async function testBatchProcessing(): Promise<void> {
  console.log('\n=== Testing Batch Processing ===')

  const batchNode = new TestBatchNode()
  const shared: BatchTestStore = {
    items: ['batch_item_1', 'batch_item_2', 'batch_item_3'],
    processed: []
  }

  console.log('Created TestBatchNode')
  console.log('Running batch processing...')

  const result = await batchNode.run(shared)

  console.log('Batch processing completed')
  console.log('Processed items:', shared.processed)
  console.log('Number of items processed:', shared.processed?.length)
}

async function testErrorHandlingAndRetry(): Promise<void> {
  console.log('\n=== Testing Error Handling and Retry Logic ===')

  const errorNode = new TestErrorNode(2, 3) // Fail 2 times, retry up to 3 times
  const shared: TestSharedStore = { input: 'error_test_input' }

  console.log('Created TestErrorNode (will fail 2 times before succeeding)')
  console.log('Running error test...')

  const result = await errorNode.run(shared)

  console.log('Error test completed')
  console.log('Final result:', result)
  console.log('Shared state:', shared)
}

async function testConditionalTransitions(): Promise<void> {
  console.log('\n=== Testing Conditional Transitions ===')

  const startNode = new TestConditionalNode('start')
  const branchA = new TestNode('branch_a')
  const branchB = new TestNode('branch_b')
  const endNode = new TestNode('end')

  // Test conditional transitions
  startNode.on('branch_a', branchA)
  startNode.on('branch_b', branchB)
  startNode.on('end', endNode)

  const flow = new Flow(startNode)
  const shared: TestSharedStore = { input: 'conditional_test', counter: 0 }

  console.log('Created flow with conditional transitions')
  console.log('Running conditional flow test...')

  await flow.run(shared)

  console.log('Conditional flow test completed')
  console.log('Final shared state:', shared)
}

async function testPythonEquivalentPatterns(): Promise<void> {
  console.log('\n=== Testing Python Equivalent Patterns ===')

  // Python equivalent patterns from cookbook examples

  // 1. Basic Chat Pattern (like pocketflow-chat)
  class ChatNode extends Node<TestSharedStore> {
    async prep(shared: TestSharedStore): Promise<string> {
      if (!shared.input) {
        shared.input = "Hello, how are you?" // Simulate user input
      }
      return shared.input
    }

    async exec(message: string): Promise<string> {
      // Simulate LLM call
      return `AI Response to: "${message}"`
    }

    async post(shared: TestSharedStore, prep_res: string, exec_res: string): Promise<string> {
      shared.output = exec_res
      shared.counter = (shared.counter || 0) + 1

      if (shared.counter >= 3) {
        return 'end' // End conversation
      }
      return 'continue' // Continue conversation
    }
  }

  // 2. Workflow Pattern (like pocketflow-workflow)
  class OutlineNode extends Node<TestSharedStore> {
    async prep(shared: TestSharedStore): Promise<string> {
      return shared.input || 'Default topic'
    }

    async exec(topic: string): Promise<string> {
      return `Outline for: ${topic}`
    }

    async post(shared: TestSharedStore, prep_res: string, exec_res: string): Promise<string> {
      shared.outline = exec_res
      return 'write_content'
    }
  }

  class WriteContentNode extends Node<TestSharedStore> {
    async prep(shared: TestSharedStore): Promise<string> {
      return shared.outline || 'No outline'
    }

    async exec(outline: string): Promise<string> {
      return `Content based on: ${outline}`
    }

    async post(shared: TestSharedStore, prep_res: string, exec_res: string): Promise<string> {
      shared.content = exec_res
      return 'end'
    }
  }

  // 3. Test the patterns
  console.log('\n--- Testing Chat Pattern ---')
  const chatNode = new ChatNode()
  const chatFlow = new Flow(chatNode)
  const chatShared: TestSharedStore = { input: 'What is AI?', counter: 0 }

  // Chat pattern with self-loop
  chatNode.on('continue', chatNode)

  await chatFlow.run(chatShared)
  console.log('Chat pattern result:', chatShared)

  console.log('\n--- Testing Workflow Pattern ---')
  const outlineNode = new OutlineNode()
  const writeNode = new WriteContentNode()

  outlineNode.next(writeNode)

  const workflowFlow = new Flow(outlineNode)
  const workflowShared: TestSharedStore = { input: 'TypeScript Best Practices' }

  await workflowFlow.run(workflowShared)
  console.log('Workflow pattern result:', workflowShared)
}

// Main test runner
async function runBasicTests(): Promise<void> {
  console.log('🚀 PocketFlow TypeScript Basic Functionality Test Suite')
  console.log('=========================================================\n')

  const tests = [
    { name: 'Basic Node Creation', fn: testBasicNodeCreation },
    { name: 'Flow Creation', fn: testFlowCreation },
    { name: 'Batch Processing', fn: testBatchProcessing },
    { name: 'Error Handling and Retry', fn: testErrorHandlingAndRetry },
    { name: 'Conditional Transitions', fn: testConditionalTransitions },
    { name: 'Python Equivalent Patterns', fn: testPythonEquivalentPatterns }
  ]

  const results: { name: string; status: string; error?: Error }[] = []

  for (const test of tests) {
    try {
      console.log(`\n📋 Running: ${test.name}`)
      await test.fn()
      console.log(`✅ PASSED: ${test.name}`)
      results.push({ name: test.name, status: 'PASSED' })
    } catch (error) {
      console.error(`❌ FAILED: ${test.name}`)
      console.error('Error:', error)
      results.push({ name: test.name, status: 'FAILED', error: error as Error })
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'PASSED').length
  const failed = results.filter(r => r.status === 'FAILED').length

  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌'
    console.log(`${icon} ${result.name}: ${result.status}`)
    if (result.error) {
      console.log(`   Error: ${result.error.message}`)
    }
  })

  console.log(`\n📈 Results: ${passed}/${results.length} tests passed, ${failed} failed`)

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the implementation.')
  } else {
    console.log('\n🎉 All basic tests passed! The TypeScript template is working correctly.')
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runBasicTests().catch(console.error)
}

export {
  runBasicTests,
  testBasicNodeCreation,
  testFlowCreation,
  testBatchProcessing,
  testErrorHandlingAndRetry,
  testConditionalTransitions,
  testPythonEquivalentPatterns,
  TestNode,
  TestBatchNode,
  TestErrorNode,
  TestConditionalNode
}