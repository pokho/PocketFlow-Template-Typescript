import { Node } from 'pocketflow'

/**
 * Type-safe shared store validator
 */
export interface SharedStoreValidator<T = any> {
  validate(shared: unknown): shared is T
  getValidationErrors(shared: unknown): string[]
}

/**
 * Create a validator for shared store interfaces
 */
export function createValidator<T>(
  validator: (shared: unknown) => shared is T,
  getErrors: (shared: unknown) => string[]
): SharedStoreValidator<T> {
  return {
    validate: validator,
    getValidationErrors: getErrors
  }
}

/**
 * Enhanced Node with type safety and validation
 */
export class TypeSafeNode<T = any> extends Node<T> {
  private validator?: SharedStoreValidator<T>

  constructor(validator?: SharedStoreValidator<T>, options?: any) {
    super(options)
    this.validator = validator
  }

  async run(shared: unknown): Promise<string | undefined> {
    // Validate shared store before execution
    if (this.validator && !this.validator.validate(shared)) {
      const errors = this.validator.getValidationErrors(shared)
      throw new TypeError(`Invalid shared store: ${errors.join(', ')}`)
    }

    return super.run(shared as T)
  }
}

/**
 * Example validator for common shared store patterns
 */
export const createStringValidator = createValidator(
  (shared): shared is { input: string; output?: string } =>
    typeof shared === 'object' &&
    shared !== null &&
    'input' in shared &&
    typeof (shared as any).input === 'string',
  (shared): string[] => {
    const errors: string[] = []
    if (typeof shared !== 'object' || shared === null) {
      errors.push('Shared store must be an object')
    } else if (!('input' in shared)) {
      errors.push('Missing required property: input')
    } else if (typeof (shared as any).input !== 'string') {
      errors.push('Property "input" must be a string')
    }
    return errors
  }
)

export const createNumberValidator = createValidator(
  (shared): shared is { value: number; result?: number } =>
    typeof shared === 'object' &&
    shared !== null &&
    'value' in shared &&
    typeof (shared as any).value === 'number',
  (shared): string[] => {
    const errors: string[] = []
    if (typeof shared !== 'object' || shared === null) {
      errors.push('Shared store must be an object')
    } else if (!('value' in shared)) {
      errors.push('Missing required property: value')
    } else if (typeof (shared as any).value !== 'number') {
      errors.push('Property "value" must be a number')
    }
    return errors
  }
)