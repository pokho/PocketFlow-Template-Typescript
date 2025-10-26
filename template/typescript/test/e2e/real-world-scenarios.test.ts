import { describe, it, expect, beforeEach } from 'vitest'
import { Node, Flow } from 'pocketflow'

// Real-world interfaces
interface ChatState {
  messages: Array<{ role: string; content: string }>
  userInput?: string
  botResponse?: string
  conversationComplete?: boolean
}

interface DocumentProcessingState {
  documents: Array<{ id: string; content: string; summary?: string }>
  currentDoc?: string
  finalReport?: string
  processingComplete?: boolean
}

// Mock LLM utility
async function mockLLM(prompt: string, context?: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 50)) // Simulate API call
  return `Response to: ${prompt.substring(0, 50)}...`
}

// Real-world node implementations
class ChatInputNode extends Node<ChatState> {
  async prep(shared: ChatState): Promise<{ input: string; context: string }> {
    const context = shared.messages.map(m => `${m.role}: ${m.content}`).join('\n')
    return {
      input: shared.userInput || 'Hello',
      context
    }
  }

  async exec(data: { input: string; context: string }): Promise<string> {
    return await mockLLM(data.input, data.context)
  }

  async post(shared: ChatState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.botResponse = execRes
    shared.messages.push({ role: 'user', content: prepRes.input })
    shared.messages.push({ role: 'assistant', content: execRes })
    return 'analyze'
  }
}

class ConversationAnalyzerNode extends Node<ChatState> {
  async prep(shared: ChatState): Promise<Array<{ role: string; content: string }>> {
    return shared.messages
  }

  async exec(messages: Array<{ role: string; content: string }>): Promise<boolean> {
    // Simple logic: end conversation after 4 messages
    return messages.length >= 4
  }

  async post(shared: ChatState, prepRes: any, execRes: boolean): Promise<string | undefined> {
    shared.conversationComplete = execRes
    return execRes ? undefined : 'continue'
  }
}

class DocumentInputNode extends Node<DocumentProcessingState> {
  async prep(shared: DocumentProcessingState): Promise<string> {
    const doc = shared.documents.find(d => !d.summary)
    if (doc) {
      shared.currentDoc = doc.id
      return doc.content
    }
    return ''
  }

  async exec(content: string): Promise<string> {
    if (!content) return ''
    return await mockLLM(`Summarize: ${content}`)
  }

  async post(shared: DocumentProcessingState, prepRes: any, execRes: string): Promise<string | undefined> {
    if (shared.currentDoc && execRes) {
      const doc = shared.documents.find(d => d.id === shared.currentDoc)
      if (doc) {
        doc.summary = execRes
      }
    }

    const hasUnprocessed = shared.documents.some(d => !d.summary)
    return hasUnprocessed ? 'process' : 'report'
  }
}

class ReportGeneratorNode extends Node<DocumentProcessingState> {
  async prep(shared: DocumentProcessingState): Promise<string> {
    const summaries = shared.documents
      .filter(d => d.summary)
      .map(d => `Doc ${d.id}: ${d.summary}`)
      .join('\n')
    return summaries
  }

  async exec(summaries: string): Promise<string> {
    return await mockLLM(`Generate final report from:\n${summaries}`)
  }

  async post(shared: DocumentProcessingState, prepRes: any, execRes: string): Promise<string | undefined> {
    shared.finalReport = execRes
    shared.processingComplete = true
    return undefined
  }
}

describe('Real-World End-to-End Scenarios', () => {
  describe('Chatbot Workflow', () => {
    let chatState: ChatState

    beforeEach(() => {
      chatState = {
        messages: [],
        userInput: 'What is the weather like?'
      }
    })

    it('should handle complete chat conversation', async () => {
      const inputNode = new ChatInputNode()
      const analyzerNode = new ConversationAnalyzerNode()

      inputNode.on('analyze', analyzerNode)
      analyzerNode.on('continue', inputNode) // Loop back for more input
      analyzerNode.on('default', inputNode) // Fallback transition

      const chatbot = new Flow(inputNode)

      // Simulate multiple rounds
      await chatbot.run(chatState)

      expect(chatState.messages).toHaveLength(2) // User + assistant
      expect(chatState.botResponse).toBeDefined()
      expect(chatState.conversationComplete).toBe(false) // Should continue

      // Add more input and continue
      chatState.userInput = 'Tell me more about weather patterns.'
      await chatbot.run(chatState)

      expect(chatState.messages).toHaveLength(4)
      expect(chatState.conversationComplete).toBe(true)
    })

    it('should maintain conversation context', async () => {
      const inputNode = new ChatInputNode()
      const analyzerNode = new ConversationAnalyzerNode()

      inputNode.on('analyze', analyzerNode)
      analyzerNode.on('continue', inputNode)
      analyzerNode.on('default', inputNode) // Fallback transition

      const chatbot = new Flow(inputNode)

      await chatbot.run(chatState)

      expect(chatState.messages.map(m => m.role)).toEqual(['user', 'assistant'])
      expect(chatState.botResponse).toContain('Response to:')
    })
  })

  describe('Document Processing Pipeline', () => {
    let docState: DocumentProcessingState

    beforeEach(() => {
      docState = {
        documents: [
          { id: 'doc1', content: 'This is the first document about technology trends.' },
          { id: 'doc2', content: 'This document discusses renewable energy sources and their impact.' },
          { id: 'doc3', content: 'The final document covers market analysis and investment strategies.' }
        ]
      }
    })

    it('should process all documents and generate report', async () => {
      const inputNode = new DocumentInputNode()
      const reportNode = new ReportGeneratorNode()

      inputNode.on('process', inputNode) // Self-loop for processing multiple docs
      inputNode.on('report', reportNode)

      const processor = new Flow(inputNode)

      await processor.run(docState)

      expect(docState.documents.every(d => d.summary)).toBe(true)
      expect(docState.finalReport).toBeDefined()
      expect(docState.processingComplete).toBe(true)
    })

    it('should handle empty document set', async () => {
      docState.documents = []

      const inputNode = new DocumentInputNode()
      const reportNode = new ReportGeneratorNode()

      inputNode.on('report', reportNode)

      const processor = new Flow(inputNode)

      await processor.run(docState)

      expect(docState.finalReport).toBeDefined() // Should still generate report
      expect(docState.processingComplete).toBe(true)
    })
  })

  describe('Error Handling in Real Scenarios', () => {
    it('should handle LLM API failures gracefully', async () => {
      class FailingChatNode extends Node<ChatState> {
        async exec(): Promise<string> {
          throw new Error('API rate limit exceeded')
        }

        async execFallback(prepRes: any, error: Error): Promise<string> {
          return 'I apologize, but I am currently experiencing high demand. Please try again later.'
        }
      }

      const chatState: ChatState = { messages: [], userInput: 'Test message' }
      const failingNode = new FailingChatNode({ maxRetries: 2 })
      const flow = new Flow(failingNode)

      failingNode.post = async (shared, prepRes, execRes) => {
        shared.botResponse = execRes
        shared.messages.push({ role: 'assistant', content: execRes })
        return undefined
      }

      await flow.run(chatState)

      expect(chatState.botResponse).toBeDefined()
      expect(chatState.botResponse).toContain('apologize')
      expect(chatState.messages).toHaveLength(1)
    })
  })

  describe('Performance in Real Scenarios', () => {
    it('should handle realistic workloads efficiently', async () => {
      // Test with larger document set
      const largeDocState: DocumentProcessingState = {
        documents: Array.from({ length: 10 }, (_, i) => ({
          id: `doc${i + 1}`,
          content: `Document ${i + 1} content about various topics. `.repeat(20)
        }))
      }

      const inputNode = new DocumentInputNode()
      const reportNode = new ReportGeneratorNode()

      inputNode.on('process', inputNode)
      inputNode.on('report', reportNode)

      const processor = new Flow(inputNode)

      const startTime = Date.now()
      await processor.run(largeDocState)
      const endTime = Date.now()

      const executionTime = endTime - startTime
      expect(executionTime).toBeLessThan(3000) // Should complete within 3 seconds
      expect(largeDocState.documents.every(d => d.summary)).toBe(true)
      expect(largeDocState.processingComplete).toBe(true)
    })
  })
})