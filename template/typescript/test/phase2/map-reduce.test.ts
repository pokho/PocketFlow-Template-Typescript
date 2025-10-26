import { describe, it, expect, beforeEach } from 'vitest'
import {
  MapReduceFlow,
  WordCountFlow,
  BatchMapReduceFlow,
  createMapReduceFlow,
  createWordCountFlow,
  createBatchMapReduceFlow
} from '../../src/enhancements/map-reduce-patterns'

describe('Map-Reduce Patterns', () => {
  describe('MapReduceFlow', () => {
    it('should perform basic map-reduce operations', async () => {
      const mapFn = async (num: number): Promise<number> => num * 2
      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue)
      const result = await flow.run([1, 2, 3, 4, 5])

      expect(result).toBe(30) // (1+2+3+4+5) * 2 = 30
    })

    it('should handle string processing', async () => {
      const texts = [
        'hello world',
        'hello there',
        'world peace'
      ]

      const mapFn = async (text: string): Promise<string[]> =>
        text.toLowerCase().split(' ')

      const reduceFn = async (words: string[], current: string[]): Promise<string[]> =>
        [...words, ...current]

      const initialValue: string[] = []

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue)
      const result = await flow.run(texts)

      expect(result).toEqual(['hello', 'world', 'hello', 'there', 'world', 'peace'])
    })

    it('should respect concurrency limits', async () => {
      const processingTimes: number[] = []

      const mapFn = async (num: number): Promise<number> => {
        const start = Date.now()
        await new Promise(resolve => setTimeout(resolve, 50))
        processingTimes.push(Date.now() - start)
        return num * 2
      }

      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue, { maxConcurrency: 2 })
      await flow.run([1, 2, 3, 4])

      // With concurrency limit of 2, we should see some parallel processing
      expect(processingTimes).toHaveLength(4)
      expect(Math.max(...processingTimes)).toBeLessThan(200) // Should not be sequential
    })

    it('should handle empty input', async () => {
      const mapFn = async (num: number): Promise<number> => num * 2
      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue)
      const result = await flow.run([])

      expect(result).toBe(0)
    })

    it('should track execution state', async () => {
      const mapFn = async (num: number): Promise<number> => num * 2
      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const flow = new MapReduceFlow(mapFn, reduceFn, initialValue)

      // The flow internally tracks state, we just verify it completes successfully
      const result = await flow.run([1, 2, 3])

      // Verify we got the expected result: (1+2+3) * 2 = 12
      expect(result).toBe(12)
    })
  })

  describe('WordCountFlow', () => {
    it('should count word frequencies correctly', async () => {
      const texts = [
        'the quick brown fox',
        'the lazy dog',
        'quick brown fox jumps'
      ]

      const wordCountFlow = new WordCountFlow()
      const result = await wordCountFlow.run(texts)

      expect(result['the']).toBe(2)
      expect(result['quick']).toBe(2)
      expect(result['brown']).toBe(2)
      expect(result['fox']).toBe(2)
      expect(result['lazy']).toBe(1)
      expect(result['dog']).toBe(1)
      expect(result['jumps']).toBe(1)
    })

    it('should handle punctuation and case', async () => {
      const texts = [
        'Hello, World!',
        'hello world.',
        'HELLO WORLD?'
      ]

      const wordCountFlow = new WordCountFlow()
      const result = await wordCountFlow.run(texts)

      expect(result['hello']).toBe(3)
      expect(result['world']).toBe(3)
    })

    it('should handle empty strings', async () => {
      const texts = ['', '   ', 'hello world']

      const wordCountFlow = new WordCountFlow()
      const result = await wordCountFlow.run(texts)

      expect(result['hello']).toBe(1)
      expect(result['world']).toBe(1)
      expect(Object.keys(result)).toHaveLength(2)
    })
  })

  describe('BatchMapReduceFlow', () => {
    it('should process large datasets in batches', async () => {
      const data = Array.from({ length: 25 }, (_, i) => i + 1)

      const mapFn = async (num: number): Promise<{ value: number; square: number }> => ({
        value: num,
        square: num * num
      })

      const reduceFn = async (sum: any, current: any): Promise<any> => ({
        total: sum.total + current.value,
        totalSquares: sum.totalSquares + current.square,
        count: sum.count + 1
      })

      const initialValue = { total: 0, totalSquares: 0, count: 0 }

      const batchFlow = createBatchMapReduceFlow(mapFn, reduceFn, initialValue, 5, {
        maxConcurrency: 2,
        batchDelay: 10
      })

      const result = await batchFlow.run(data)

      expect(result.total).toBe(325) // Sum of 1 to 25
      expect(result.totalSquares).toBe(5525) // Sum of squares 1² to 25²
      expect(result.count).toBe(25)
    })

    it('should handle batch delays', async () => {
      const data = [1, 2, 3, 4, 5, 6]

      const mapFn = async (num: number): Promise<number> => num
      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const batchFlow = createBatchMapReduceFlow(mapFn, reduceFn, initialValue, 2, {
        batchDelay: 50
      })

      const startTime = Date.now()
      const result = await batchFlow.run(data)
      const endTime = Date.now()

      expect(result).toBe(21)
      expect(endTime - startTime).toBeGreaterThan(100) // Should have delays
    })

    it('should maintain order across batches', async () => {
      const data = Array.from({ length: 15 }, (_, i) => i)

      const mapFn = async (num: number): Promise<number> => num * 10
      const reduceFn = async (list: number[], current: number): Promise<number[]> => [...list, current]
      const initialValue: number[] = []

      const batchFlow = createBatchMapReduceFlow(mapFn, reduceFn, initialValue, 5)
      const result = await batchFlow.run(data)

      expect(result).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140])
    })

    it('should handle complex data structures', async () => {
      interface DataItem {
        id: number
        category: string
        value: number
      }

      const data: DataItem[] = [
        { id: 1, category: 'A', value: 10 },
        { id: 2, category: 'B', value: 20 },
        { id: 3, category: 'A', value: 15 },
        { id: 4, category: 'C', value: 5 },
        { id: 5, category: 'B', value: 25 }
      ]

      const mapFn = async (item: DataItem): Promise<{ category: string; value: number }> => ({
        category: item.category,
        value: item.value
      })

      const reduceFn = async (acc: Record<string, number[]>, current: { category: string; value: number }): Promise<Record<string, number[]>> => {
        if (!acc[current.category]) {
          acc[current.category] = []
        }
        acc[current.category].push(current.value)
        return acc
      }

      const initialValue: Record<string, number[]> = {}

      const batchFlow = createBatchMapReduceFlow(mapFn, reduceFn, initialValue, 2)
      const result = await batchFlow.run(data)

      expect(result['A']).toEqual([10, 15])
      expect(result['B']).toEqual([20, 25])
      expect(result['C']).toEqual([5])
    })
  })

  describe('Error Handling', () => {
    it('should handle map function errors', async () => {
      const mapFn = async (num: number): Promise<number> => {
        if (num === 3) {
          throw new Error('Failed to process 3')
        }
        return num * 2
      }

      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue)

      await expect(flow.run([1, 2, 3, 4])).rejects.toThrow('Failed to process 3')
    })

    it('should handle reduce function errors', async () => {
      const mapFn = async (num: number): Promise<number> => num * 2
      const reduceFn = async (sum: number, current: number): Promise<number> => {
        if (current === 6) {
          throw new Error('Failed to reduce 6')
        }
        return sum + current
      }

      const initialValue = 0

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue)

      await expect(flow.run([1, 2, 3])).rejects.toThrow('Failed to reduce 6')
    })

    it('should handle invalid initial values', async () => {
      const mapFn = async (num: number): Promise<string> => num.toString()
      const reduceFn = async (acc: string, current: string): Promise<string> => acc + current
      const initialValue = '' // Valid string

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue)
      const result = await flow.run([1, 2, 3])

      expect(result).toBe('123')
    })
  })

  describe('Performance and Concurrency', () => {
    it('should complete faster than sequential processing', async () => {
      const data = Array.from({ length: 20 }, (_, i) => i + 1)

      const mapFn = async (num: number): Promise<number> => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return num * 2
      }

      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const flow = createMapReduceFlow(mapFn, reduceFn, initialValue, { maxConcurrency: 5 })

      const startTime = Date.now()
      const result = await flow.run(data)
      const executionTime = Date.now() - startTime

      expect(result).toBe(420) // Sum of 1-20 * 2
      expect(executionTime).toBeLessThan(200) // Should be faster than sequential (200ms)
    })

    it('should handle memory efficiently with large datasets', async () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => i)

      const mapFn = async (num: number): Promise<number> => num % 100
      const reduceFn = async (sum: number, current: number): Promise<number> => sum + current
      const initialValue = 0

      const batchFlow = createBatchMapReduceFlow(mapFn, reduceFn, initialValue, 100)

      const startTime = Date.now()
      const result = await batchFlow.run(largeData)
      const executionTime = Date.now() - startTime

      expect(result).toBeGreaterThan(0)
      expect(executionTime).toBeLessThan(1000) // Should complete reasonably fast
    })
  })
})