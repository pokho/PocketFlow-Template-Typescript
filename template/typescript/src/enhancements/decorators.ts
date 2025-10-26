import { Node } from 'pocketflow'

/**
 * Retry decorator for nodes
 */
export function Retry(options: { maxRetries: number; wait: number }) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      maxRetries = options.maxRetries
      wait = options.wait
    }
  }
}

/**
 * Input validation decorator
 */
export function ValidateInput<T>(validator: (input: any) => input is T) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    descriptor.value = async function (prepRes: any) {
      if (!validator(prepRes)) {
        throw new TypeError(`Invalid input for ${propertyKey}`)
      }
      return originalMethod.call(this, prepRes)
    }
  }
}

/**
 * Performance monitoring decorator
 */
export function MonitorPerformance() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      try {
        const result = await originalMethod.apply(this, args)
        const executionTime = Date.now() - startTime

        // Store metrics if the node has a metrics property
        if ((this as any).performanceMetrics) {
          (this as any).performanceMetrics.push({
            method: propertyKey,
            executionTime,
            success: true,
            timestamp: Date.now()
          })
        }

        return result
      } catch (error) {
        const executionTime = Date.now() - startTime

        if ((this as any).performanceMetrics) {
          (this as any).performanceMetrics.push({
            method: propertyKey,
            executionTime,
            success: false,
            error: error as Error,
            timestamp: Date.now()
          })
        }

        throw error
      }
    }
  }
}

/**
 * Logging decorator
 */
export function Log(level: 'debug' | 'info' | 'warn' | 'error' = 'info') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      console[level](`[${target.constructor.name}] Starting ${propertyKey}`)

      try {
        const result = await originalMethod.apply(this, args)
        console[level](`[${target.constructor.name}] Completed ${propertyKey}`)
        return result
      } catch (error) {
        console[level](`[${target.constructor.name}] Failed ${propertyKey}:`, error)
        throw error
      }
    }
  }
}

/**
 * Circuit breaker decorator
 */
export function CircuitBreaker(options: {
  failureThreshold: number
  recoveryTime: number
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    let failureCount = 0
    let lastFailureTime = 0

    descriptor.value = async function (...args: any[]) {
      const now = Date.now()

      // Check if circuit is open
      if (failureCount >= options.failureThreshold &&
          now - lastFailureTime < options.recoveryTime) {
        throw new Error(`Circuit breaker open for ${propertyKey}`)
      }

      // Check if circuit should be half-open
      if (failureCount >= options.failureThreshold &&
          now - lastFailureTime >= options.recoveryTime) {
        console.log(`Circuit breaker half-open for ${propertyKey}`)
      }

      try {
        const result = await originalMethod.apply(this, args)

        // Reset failure count on success
        if (failureCount > 0) {
          console.log(`Circuit breaker reset for ${propertyKey}`)
          failureCount = 0
        }

        return result
      } catch (error) {
        failureCount++
        lastFailureTime = now

        if (failureCount >= options.failureThreshold) {
          console.log(`Circuit breaker opened for ${propertyKey}`)
        }

        throw error
      }
    }
  }
}

/**
 * Cache decorator for memoization
 */
export function Cache(ttl: number = 300000) { // 5 minutes default
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const cache = new Map<string, { value: any; expiry: number }>()

    descriptor.value = async function (...args: any[]) {
      const key = JSON.stringify(args)
      const cached = cache.get(key)

      if (cached && Date.now() < cached.expiry) {
        return cached.value
      }

      const result = await originalMethod.apply(this, args)

      cache.set(key, {
        value: result,
        expiry: Date.now() + ttl
      })

      return result
    }
  }
}

/**
 * Types for decorator metrics
 */
interface MethodMetrics {
  method: string
  executionTime: number
  success: boolean
  error?: Error
  timestamp: number
}