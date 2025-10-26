# Design Doc: PocketFlow TypeScript Template

> Please DON'T remove notes for AI

## Requirements

> Notes for AI: Keep it simple and clear.
> If the requirements are abstract, write concrete user stories

### Technical Requirements

**Core Compatibility Requirements:**
- 100% API compatibility with Python PocketFlow framework
- TypeScript implementation with strict type safety
- Enhanced async support with performance monitoring
- Comprehensive error handling and retry mechanisms

**Functional Requirements:**
- Node Creation: `new Node()` equivalent to Python `Node()` class
- Flow Orchestration: `node1.next(node2)` replaces Python `node1 >> node2`
- Batch Processing: `BatchNode` with identical functionality to Python version
- Conditional Transitions: `node.on('action', target)` replaces Python syntax
- Error Handling: `maxRetries`, `wait`, `execFallback` properties work correctly

**Non-Functional Requirements:**
- Performance: 20% faster async execution than Python equivalent
- Memory Usage: < 50MB for typical workflows
- Build Time: < 5 seconds for full compilation
- Test Coverage: 95%+ for core functionality
- Type Safety: Strict TypeScript mode enabled throughout

**User Stories:**
1. As a developer, I want to create TypeScript workflows that are fully compatible with Python PocketFlow patterns
2. As a developer, I want enhanced async support with built-in performance monitoring
3. As a developer, I want type-safe flows with compile-time validation
4. As a developer, I want comprehensive error handling with configurable retry logic
5. As a developer, I want working demo applications to understand usage patterns

## Flow Design

> Notes for AI:
>
> 1. Consider the design patterns of agent, map-reduce, rag, and workflow. Apply them if they fit.
> 2. Present a concise, high-level description of the workflow.

### Architecture Overview

The PocketFlow TypeScript template uses a **hybrid architecture** that:
1. **Leverages Base Library**: Core PocketFlow functionality from the base npm package
2. **Adds TypeScript Layers**: Enhanced features in `src/enhancements/` directory
3. **Maintains Compatibility**: All Python PocketFlow patterns work identically
4. **Provides TypeScript Benefits**: Type safety, monitoring, and enhanced developer experience

### Applicable Design Patterns:

1. **Map-Reduce Pattern**:
   - Map: Process data chunks in parallel using BatchNode
   - Reduce: Aggregate results using regular Node with combiner logic
   - Example: Batch text processing followed by summary generation

2. **Agent Pattern**:
   - Context: Available actions and current system state
   - Actions: Conditional node transitions based on LLM decisions
   - Example: Dynamic workflow routing based on content analysis

3. **RAG (Retrieval-Augmented Generation) Pattern**:
   - Indexing: Offline embedding generation and storage
   - Retrieval: Online similarity search and context injection
   - Generation: LLM-powered response with retrieved context

4. **Workflow Pattern**:
   - Sequential processing with error handling
   - Parallel execution where appropriate
   - State management through shared store

### Flow High-Level Design:

1. **Input Node**: Handles user input and initial validation
2. **Processing Nodes**: Core business logic execution (can be batch/async)
3. **Decision Node**: LLM-powered routing and conditional logic
4. **Output Node**: Final result formatting and delivery

```mermaid
flowchart TD
    input[Input Node] --> validate[Validation Node]
    validate -->|Valid| process[Processing Nodes]
    validate -->|Invalid| error[Error Handler]

    subgraph process[Processing Layer]
        batch[Batch Processing] --> parallel[Parallel Execution]
        parallel --> aggregate[Aggregation Node]
    end

    process --> decision[Decision Node]
    decision -->|Route A| outputA[Output A]
    decision -->|Route B| outputB[Output B]
    decision -->|Route C| outputC[Output C]

    error --> retry[Retry Logic]
    retry --> input

    outputA --> end[End]
    outputB --> end
    outputC --> end
```

### Technical Implementation Patterns

**Node Connection Pattern:**
```typescript
// Python: node1 >> node2
// TypeScript: node1.next(node2)

// Python: node - "action" >> target
// TypeScript: node.on('action', target)
```

**Batch Processing Pattern:**
```typescript
const batchNode = new BatchNode({
    maxConcurrency: 10,
    errorHandler: (error, item) => {
        console.error(`Batch item failed: ${error.message}`);
        return null; // Skip failed item
    }
});
```

**Error Handling Pattern:**
```typescript
const resilientNode = new Node({
    maxRetries: 3,
    wait: 1000,
    execFallback: (input, error) => {
        return `Fallback result for ${input}`;
    }
});
```

## Utility Functions

> Notes for AI:
>
> 1. Understand the utility function definition thoroughly by reviewing the doc.
> 2. Include only the necessary utility functions, based on nodes in the flow.

### Core Utility Functions

1. **Call LLM** (`src/utils/callLlm.ts`)

   - _Input_: prompt (string), options (LLMConfig)
   - _Output_: response (string)
   - _Generally used by most nodes for LLM tasks
   - _Implementation Example_:
   ```typescript
   export async function callLlm(prompt: string, config: LLMConfig): Promise<string> {
       // Implementation with retry logic and error handling
       const response = await fetch(config.endpoint, {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${config.apiKey}` },
           body: JSON.stringify({ prompt, model: config.model })
       });
       return response.json();
   }

   if (import.meta.url === 'file://') {
       callLlm("Test prompt", { apiKey: "test", model: "gpt-3.5-turbo" });
   }
   ```

2. **Embedding Generation** (`src/utils/getEmbedding.ts`)
   - _Input_: text (string)
   - _Output_: vector of 3072 floats (number[])
   - _Used by RAG patterns and similarity search_
   - _Implementation Example_:
   ```typescript
   export async function getEmbedding(text: string): Promise<number[]> {
       const response = await fetch('https://api.openai.com/v1/embeddings', {
           method: 'POST',
           headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
           body: JSON.stringify({ input: text, model: "text-embedding-ada-002" })
       });
       const data = await response.json();
       return data.data[0].embedding;
   }
   ```

3. **Performance Monitor** (`src/utils/performanceMonitor.ts`)
   - _Input_: operation name (string), function to measure
   - _Output_: result with performance metrics
   - _Used for enhanced async nodes with built-in monitoring_
   - _Implementation Example_:
   ```typescript
   export async function withPerformanceMonitoring<T>(
       operation: string,
       fn: () => Promise<T>
   ): Promise<{ result: T; metrics: PerformanceMetrics }> {
       const start = performance.now();
       const startMemory = process.memoryUsage();

       const result = await fn();

       const end = performance.now();
       const endMemory = process.memoryUsage();

       return {
           result,
           metrics: {
               duration: end - start,
               memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
               timestamp: Date.now()
           }
       };
   }
   ```

4. **Batch Processor** (`src/utils/batchProcessor.ts`)
   - _Input_: items array, processing function, batch size
   - _Output_: processed results array
   - _Used for map-reduce patterns and parallel processing_
   - _Implementation Example_:
   ```typescript
   export async function processBatch<T, R>(
       items: T[],
       processor: (item: T) => Promise<R>,
       batchSize: number = 10
   ): Promise<R[]> {
       const batches: T[][] = [];
       for (let i = 0; i < items.length; i += batchSize) {
           batches.push(items.slice(i, i + batchSize));
       }

       const results: R[] = [];
       for (const batch of batches) {
           const batchResults = await Promise.all(
               batch.map(item => processor(item))
           );
           results.push(...batchResults);
       }

       return results;
   }
   ```

5. **Type Validator** (`src/utils/typeValidator.ts`)
   - _Input_: data, schema definition
   - _Output_: validation result with error messages
   - _Used for type-safe flows and data validation_
   - _Implementation Example_:
   ```typescript
   export interface ValidationResult {
       isValid: boolean;
       errors: string[];
   }

   export function validateType<T>(data: unknown, schema: Schema): ValidationResult {
       const errors: string[] = [];

       // Implementation of type validation logic
       // Check required fields, types, formats, etc.

       return {
           isValid: errors.length === 0,
           errors
       };
   }
   ```

### TypeScript-Specific Utility Patterns

**Error-Resilient Utilities:**
- Avoid exception handling in utilities when called from Node exec()
- Let Node's retry mechanism handle failures naturally
- Provide clear error messages for debugging

**Async/Await Patterns:**
- Use TypeScript's native async/await syntax
- Implement proper error boundaries
- Consider Promise.all() for parallel operations

**Type Safety Patterns:**
- Use generics for reusable utility functions
- Define interfaces for all data structures
- Leverage TypeScript's type inference

## Node Design

### Shared Memory Structure

> Notes for AI: Try to minimize data redundancy

The shared memory structure is organized as follows:

```typescript
interface SharedMemory {
  // Core workflow data
  input?: string | Record<string, any>;
  output?: string | Record<string, any>;

  // Processing state
  currentState?: 'initialized' | 'processing' | 'completed' | 'failed';
  error?: Error;

  // User context
  user?: {
    id: string;
    context?: Record<string, any>;
    preferences?: Record<string, any>;
  };

  // Results storage
  results?: {
    [key: string]: any;
  };

  // Performance metrics
  metrics?: {
    startTime?: number;
    duration?: number;
    nodeMetrics?: Record<string, PerformanceMetrics>;
  };
}
```

### Node Types and Specifications

> Notes for AI: Carefully decide whether to use Batch/Node/Flow.

#### 1. Regular Node
**Purpose**: Sequential processing with error handling
**Use Case**: Single operations that depend on previous results

**Implementation Pattern:**
```typescript
export class ProcessingNode extends Node {
    constructor(config: NodeConfig) {
        super({
            maxRetries: config.maxRetries || 3,
            wait: config.wait || 1000,
            execFallback: config.execFallback
        });
    }

    prep(shared: SharedMemory): any {
        // Read input from shared store
        return shared.input;
    }

    async exec(input: any): Promise<any> {
        // Core processing logic
        // Avoid exception handling - let retry mechanism work
        return await this.processData(input);
    }

    post(shared: SharedMemory, prepRes: any, execRes: any): string {
        // Store results in shared store
        shared.results = { ...shared.results, processed: execRes };
        shared.currentState = 'completed';
        return "default"; // Go to next node
    }
}
```

#### 2. Batch Node
**Purpose**: Parallel processing of multiple items
**Use Case**: Map-reduce patterns, bulk data processing

**Implementation Pattern:**
```typescript
export class BatchProcessingNode extends BatchNode {
    constructor(config: BatchConfig) {
        super({
            maxConcurrency: config.maxConcurrency || 10,
            errorHandler: (error, item) => {
                console.error(`Batch item failed: ${error.message}`);
                return null; // Skip failed items or implement retry logic
            }
        });
    }

    prep(shared: SharedMemory): any[] {
        // Extract array of items to process
        return shared.input.items || [];
    }

    async exec(item: any): Promise<any> {
        // Process individual item
        return await this.processItem(item);
    }

    post(shared: SharedMemory, prepRes: any, execRes: any): string {
        // Aggregate batch results
        shared.results = { ...shared.results, batchResults: execRes };
        return "default";
    }
}
```

#### 3. Async Node with Performance Monitoring
**Purpose**: Async operations with built-in monitoring
**Use Case**: External API calls, database operations

**Implementation Pattern:**
```typescript
export class EnhancedAsyncNode extends Node {
    private monitor: PerformanceMonitor;

    constructor(config: AsyncNodeConfig) {
        super(config);
        this.monitor = new PerformanceMonitor();
    }

    async exec(input: any): Promise<any> {
        return await this.monitor.withMonitoring(
            'async_operation',
            () => this.performAsyncOperation(input)
        );
    }

    post(shared: SharedMemory, prepRes: any, execRes: any): void {
        // Store results with performance metrics
        shared.results = {
            ...shared.results,
            data: execRes.result,
            metrics: execRes.metrics
        };
    }
}
```

#### 4. Decision Node (Agent Pattern)
**Purpose**: LLM-powered routing and conditional logic
**Use Case**: Dynamic workflow routing based on content analysis

**Implementation Pattern:**
```typescript
export class DecisionNode extends Node {
    constructor(private llmConfig: LLMConfig) {
        super();
    }

    async exec(input: any): Promise<string> {
        const prompt = `
        Analyze the following input and determine the appropriate action:
        Input: ${JSON.stringify(input)}

        Available actions:
        - route_a: Route to processing path A
        - route_b: Route to processing path B
        - route_c: Route to processing path C

        Respond with only the action name.
        `;

        const decision = await callLlm(prompt, this.llmConfig);
        return decision.trim().toLowerCase();
    }

    post(shared: SharedMemory, prepRes: any, execRes: string): string {
        // Route based on LLM decision
        shared.currentState = 'processing';
        return execRes; // Return the action name for routing
    }
}
```

### Node Connection Patterns

**Sequential Connection:**
```typescript
const node1 = new ProcessingNode();
const node2 = new ProcessingNode();
const node3 = new ProcessingNode();

node1.next(node2);
node2.next(node3);
```

**Conditional Routing:**
```typescript
const decisionNode = new DecisionNode();
const nodeA = new ProcessingNode();
const nodeB = new ProcessingNode();

decisionNode.on('route_a', nodeA);
decisionNode.on('route_b', nodeB);
```

**Error Handling Flow:**
```typescript
const mainNode = new ProcessingNode();
const errorHandler = new ErrorHandlingNode();
const retryNode = new RetryNode();

mainNode.on('error', errorHandler);
errorHandler.next(retryNode);
retryNode.next(mainNode); // Retry loop
```

### Node Design Best Practices

**Type Safety:**
- Use TypeScript interfaces for all node configurations
- Define clear input/output types for each node
- Leverage generics for reusable node patterns

**Error Handling:**
- Implement retry logic at node level
- Use execFallback for graceful degradation
- Avoid try-catch in exec() method - let retry mechanism work

**Performance Monitoring:**
- Add metrics collection to critical nodes
- Monitor execution time and memory usage
- Implement performance thresholds and alerts

**State Management:**
- Use shared store for state persistence
- Minimize data redundancy in shared memory
- Implement state transitions clearly

## Risk Analysis

### Technical Risks

**Risk 1: API Compatibility Issues**
- **Impact**: High - Could break existing Python PocketFlow patterns
- **Probability**: Medium - TypeScript differences may cause subtle bugs
- **Mitigation Strategy**:
  - Comprehensive compatibility testing suite
  - Maintain strict API parity with Python version
  - Implement automated tests for all core patterns
  - Regular synchronization with Python PocketFlow updates

**Risk 2: Performance Degradation**
- **Impact**: Medium - Could affect adoption in production environments
- **Probability**: Low - TypeScript generally performs well
- **Mitigation Strategy**:
  - Performance monitoring in all async nodes
  - Benchmark against Python implementation
  - Implement performance thresholds and alerts
  - Optimize critical paths and hot spots

**Risk 3: Memory Leaks in Async Operations**
- **Impact**: High - Could cause production instability
- **Probability**: Medium - Async patterns can be complex
- **Mitigation Strategy**:
  - Proper resource cleanup in all nodes
  - Memory usage monitoring and alerts
  - Implement connection pooling for external services
  - Regular memory profiling in development

**Risk 4: Type Safety Limitations**
- **Impact**: Medium - Could reduce TypeScript benefits
- **Probability**: Low - TypeScript type system is robust
- **Mitigation Strategy**:
  - Strict TypeScript configuration
  - Comprehensive type coverage for all interfaces
  - Regular static analysis and linting
  - Use of type assertions only when absolutely necessary

### Development Risks

**Risk 5: Testing Coverage Gaps**
- **Impact**: High - Could lead to production bugs
- **Probability**: Medium - Complex workflows can be hard to test
- **Mitigation Strategy**:
  - 70/20/10 test pyramid (unit/integration/e2e)
  - Automated test execution in CI/CD
  - Coverage thresholds and quality gates
  - Regular test reviews and updates

**Risk 6: Documentation Drift**
- **Impact**: Medium - Could confuse developers
- **Probability**: High - Documentation often lags behind code
- **Mitigation Strategy**:
  - Documentation updates as part of development process
  - Automated documentation generation from code
  - Regular documentation reviews
  - Example code verification in CI/CD

### Operational Risks

**Risk 7: Dependency Management Issues**
- **Impact**: Medium - Could break builds or introduce vulnerabilities
- **Probability**: Medium - JavaScript ecosystem changes frequently
- **Mitigation Strategy**:
  - Regular dependency updates and security scanning
  - Pin critical dependencies in production
  - Implement dependency vulnerability monitoring
  - Maintain clear dependency documentation

**Risk 8: Scalability Limitations**
- **Impact**: High - Could limit adoption in large-scale applications
- **Probability**: Low - Architecture designed for scalability
- **Mitigation Strategy**:
  - Load testing and performance profiling
  - Horizontal scaling patterns documentation
  - Resource usage monitoring and optimization
  - Architecture review for scale requirements

## Success Metrics

### Technical KPIs

**Performance Metrics:**
- **Async Execution Speed**: Target 20% faster than Python equivalent
- **Memory Usage**: Maintain < 50MB for typical workflows
- **Build Time**: Keep full compilation under 5 seconds
- **Startup Time**: Application initialization < 2 seconds

**Quality Metrics:**
- **Test Coverage**: Maintain 95%+ coverage for core functionality
- **Type Coverage**: 100% type coverage for all public APIs
- **Code Quality**: Maintain 9.5/10 linting score
- **Zero Runtime Errors**: No unhandled exceptions in production

**Compatibility Metrics:**
- **API Parity**: 100% compatibility with Python PocketFlow patterns
- **Migration Success**: 95%+ successful migration from Python to TypeScript
- **Pattern Equivalence**: All Python patterns work identically in TypeScript

### Development KPIs

**Productivity Metrics:**
- **Development Velocity**: 30% faster development compared to pure TypeScript implementation
- **Debug Time**: 50% reduction in debugging time with enhanced error handling
- **Onboarding Time**: New developers productive within 2 days
- **Code Reuse**: 80%+ code reuse across different projects

**Reliability Metrics:**
- **System Uptime**: 99.9% availability in production
- **Error Rate**: < 0.1% error rate for completed workflows
- **Recovery Time**: < 30 seconds average recovery from failures
- **Data Integrity**: 100% data consistency across workflow execution

### User Experience Metrics

**Developer Experience:**
- **Documentation Quality**: 4.5/5 average developer satisfaction rating
- **API Intuitiveness**: 90%+ successful first-time API usage
- **Error Message Clarity**: 95% of errors resolvable without external help
- **Learning Curve**: Developers productive within 1 week

**Community Adoption:**
- **GitHub Stars**: Target 500+ stars within 6 months
- **NPM Downloads**: Target 10K+ downloads per month
- **Community Contributions**: Target 20+ community contributors
- **Issue Resolution**: 95% of issues resolved within 48 hours

## Implementation Strategy

### Agentic Coding Collaboration

Based on the CLAUDE.md framework, the implementation follows a **Human-AI collaboration model**:

| Phase | Human Role | AI Agent Role | Deliverables |
|-------|------------|---------------|--------------|
| **Requirements** | Define business needs and context | Clarify technical feasibility | User stories, technical requirements |
| **Flow Design** | High-level workflow specification | Detailed flow patterns and architecture | Flow diagrams, design patterns |
| **Utilities** | External API specifications | Implementation of utility functions | Tested utility functions with examples |
| **Data Design** | Business logic validation | Type-safe data schemas | TypeScript interfaces, shared store design |
| **Node Design** | Workflow logic specification | Node implementations with patterns | Production-ready node classes |
| **Implementation** | Review and feedback | Code implementation and optimization | Working flows with comprehensive tests |
| **Optimization** | Performance evaluation | Performance tuning and improvements | Optimized production code |
| **Reliability** | Production requirements | Error handling and test coverage | Reliable, production-ready system |

### Development Phases

**Phase 1: Core Foundation (Completed)**
- ✅ Core PocketFlow compatibility
- ✅ Basic node types and flow orchestration
- ✅ TypeScript-specific enhancements
- ✅ Comprehensive testing infrastructure
- ✅ Documentation and examples

**Phase 2: Advanced Features (Planned)**
- 🔄 Map-reduce implementations with type safety
- 🔄 RAG (Retrieval-Augmented Generation) patterns
- 🔄 Enterprise features (logging, configuration)
- 🔄 Performance optimization tools
- 🔄 Advanced error handling patterns

**Phase 3: Production Readiness (Future)**
- 📋 Monitoring and observability tools
- 📋 Security hardening and best practices
- 📋 Scaling patterns and documentation
- 📋 Migration tools and utilities
- 📋 Community contribution guidelines

### Quality Assurance Strategy

**Testing Strategy:**
- **Unit Tests (70%)**: Core functionality, individual node operations
- **Integration Tests (20%)**: Node interactions, flow execution
- **End-to-End Tests (10%)**: Real-world workflow scenarios

**Code Quality:**
- **Static Analysis**: TypeScript strict mode, ESLint configuration
- **Code Reviews**: Human review of all AI-generated code
- **Performance Testing**: Automated benchmarks against Python version
- **Security Scanning**: Dependency vulnerability assessment

**Documentation Strategy:**
- **API Documentation**: Auto-generated from TypeScript definitions
- **Tutorial Content**: Step-by-step guides for common patterns
- **Example Applications**: Working demos for all major use cases
- **Migration Guides**: Python to TypeScript migration documentation

### Deployment Strategy

**Release Management:**
- **Semantic Versioning**: Follow SemVer for predictable releases
- **Automated Releases**: CI/CD pipeline for automated publishing
- **Feature Flags**: Gradual rollout of new features
- **Backward Compatibility**: Maintain API compatibility across major versions

**Monitoring and Observability:**
- **Performance Metrics**: Built-in monitoring for all operations
- **Error Tracking**: Comprehensive error logging and analysis
- **Usage Analytics**: Anonymous usage data for improvement
- **Health Checks**: Automated system health monitoring

**Community Engagement:**
- **Open Source Development**: Transparent development process
- **Community Feedback**: Regular feedback collection and incorporation
- **Contribution Guidelines**: Clear guidelines for community contributions
- **Support Channels**: Multiple channels for developer support
