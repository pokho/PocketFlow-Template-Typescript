import { beforeAll, afterAll } from 'vitest'

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'

  // Configure console output for tests
  if (process.env.NODE_ENV === 'test') {
    console.log('🧪 Running PocketFlow TypeScript Tests')
  }
})

afterAll(() => {
  // Cleanup after all tests
  if (process.env.NODE_ENV === 'test') {
    console.log('✅ All tests completed')
  }
})

// Mock utilities for testing
export const mockLLM = {
  respond: async (prompt: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 10))
    return `Mock response to: ${prompt.substring(0, 30)}...`
  }
}

export const createTestState = () => ({
  inputs: [],
  outputs: [],
  processed: false,
  timestamp: Date.now()
})

export const expectSuccessfulExecution = async (flow: any, state: any) => {
  const result = await flow.run(state)
  expect(result).toBeDefined()
  return result
}

export const expectErrorHandling = async (flow: any, state: any) => {
  try {
    await flow.run(state)
  } catch (error) {
    expect(error).toBeDefined()
    return error
  }
}