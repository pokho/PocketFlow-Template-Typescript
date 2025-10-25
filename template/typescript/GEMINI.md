---
layout: default
title: "Agentic Coding for TypeScript"
---

# Agentic Coding: Humans Design, Agents code!

> If you are an AI agent involved in building LLM Systems, read this guide **VERY, VERY** carefully! Throughout development, you should always (1) start with a small and simple solution, (2) design at a high level (`docs/design.md`) before implementation, and (3) frequently ask humans for feedback and clarification.
{: .warning }

## Agentic Coding Steps

Agentic Coding should be a collaboration between Human System Design and Agent Implementation:

| Steps                  | Human      | AI        | Comment                                                                 |
|:-----------------------|:----------:|:---------:|:------------------------------------------------------------------------|
| 1. Requirements | ★★★ High  | ★☆☆ Low   | Humans understand the requirements and context.                    |
| 2. Flow          | ★★☆ Medium | ★★☆ Medium |  Humans specify the high-level design, and the AI fills in the details. |
| 3. Utilities   | ★★☆ Medium | ★★☆ Medium | Humans provide available external APIs and integrations, and the AI helps with implementation. |
| 4. Data          | ★☆☆ Low    | ★★★ High   | AI designs the data schema, and humans verify.                            |
| 5. Node          | ★☆☆ Low   | ★★★ High  | The AI helps design the node based on the flow.          |
| 6. Implementation      | ★☆☆ Low   | ★★★ High  |  The AI implements the flow based on the design. |
| 7. Optimization        | ★★☆ Medium | ★★☆ Medium | Humans evaluate the results, and the AI helps optimize. |
| 8. Reliability         | ★☆☆ Low   | ★★★ High  |  The AI writes test cases and addresses corner cases.     |

1. **Requirements**: Clarify the requirements for your project, and evaluate whether an AI system is a good fit.
    - Understand AI systems' strengths and limitations:
      - **Good for**: Routine tasks requiring common sense (filling forms, replying to emails)
      - **Good for**: Creative tasks with well-defined inputs (building slides, writing SQL)
      - **Not good for**: Ambiguous problems requiring complex decision-making (business strategy, startup planning)
    - **Keep It User-Centric:** Explain the "problem" from the user's perspective rather than just listing features.
    - **Balance complexity vs. impact**: Aim to deliver the highest value features with minimal complexity early.

2. **Flow Design**: Outline at a high level, describe how your AI system orchestrates nodes.
    - Identify applicable design patterns (e.g., [Map Reduce](./design_pattern/mapreduce.md), [Agent](./design_pattern/agent.md), [RAG](./design_pattern/rag.md)).
      - For each node in the flow, start with a high-level one-line description of what it does.
      - If using **Map Reduce**, specify how to map (what to split) and how to reduce (how to combine).
      - If using **Agent**, specify what are the inputs (context) and what are the possible actions.
      - If using **RAG**, specify what to embed, noting that there's usually both offline (indexing) and online (retrieval) workflows.
    - Outline the flow and draw it in a mermaid diagram. For example:
      ```mermaid
      flowchart LR
          start[Start] --> batch[Batch]
          batch --> check[Check]
          check -->|OK| process
          check -->|Error| fix[Fix]
          fix --> check

          subgraph process[Process]
            step1[Step 1] --> step2[Step 2]
          end

          process --> endNode[End]
      ```
    - > **If Humans can't specify the flow, AI Agents can't automate it!** Before building an LLM system, thoroughly understand the problem and potential solution by manually solving example inputs to develop intuition.
      {: .best-practice }

3. **Utilities**: Based on the Flow Design, identify and implement necessary utility functions.
    - Think of your AI system as the brain. It needs a body—these *external utility functions*—to interact with the real world:
        <div align="center"><img src="https://github.com/the-pocket/.github/raw/main/assets/utility.png?raw=true" width="400"/></div>

        - Reading inputs (e.g., retrieving Slack messages, reading emails)
        - Writing outputs (e.g., generating reports, sending emails)
        - Using external tools (e.g., calling LLMs, searching the web)
        - **NOTE**: *LLM-based tasks* (e.g., summarizing text, analyzing sentiment) are **NOT** utility functions; rather, they are *core functions* internal in the AI system.
    - For each utility function, implement it and write a simple test.
    - Document their input/output, as well as why they are necessary. For example:
      - `name`: `getEmbedding` (`src/utils/getEmbedding.ts`)
      - `input`: `str`
      - `output`: a vector of 3072 floats
      - `necessity`: Used by the second node to embed text
    - Example utility implementation:
      ```typescript
      // src/utils/callLlm.ts
      export async function callLlm(prompt: string): Promise<string> {
          // Implementation details here
      }

      if (import.meta.url === 'file://') {
          callLlm("Test prompt");  // Test utility function
      }
      ```
    - > **Sometimes, design Utilities before Flow:**  For example, for an LLM project to automate a legacy system, the bottleneck will likely be the available interface to that system. Start by designing the hardest utilities for interfacing, and then build the flow around them.
      {: .best-practice }
    - > **Avoid Exception Handling in Utilities**: If a utility function is called from a Node's `exec()` method, avoid using `try...catch` blocks within the utility. Let the Node's built-in retry mechanism handle failures.
      {: .warning }

4. **Data Design**: Design the shared store that nodes will use to communicate.
   - One core design principle for PocketFlow is to use a well-designed shared store—a data contract that all nodes agree upon to retrieve and store data.
      - For simple systems, use an in-memory object.
      - For more complex systems or when persistence is required, use a database.
      - **Don't Repeat Yourself**: Use in-memory references or foreign keys.
      - Example shared store design:
        ```typescript
        const shared = {
            user: {
                id: "user123",
                context: {                // Another nested object
                    weather: {temp: 72, condition: "sunny"},
                    location: "San Francisco"
                }
            },
            results: {}                   // Empty object to store outputs
        };
        ```

5. **Node Design**: Plan how each node will read and write data, and use utility functions.
   - For each Node, describe its type, how it reads and writes data, and which utility function it uses. Keep it specific but high-level without codes. For example:
     - `type`: Regular (or Batch, or Async)
     - `prep`: Read "text" from the shared store
     - `exec`: Call the embedding utility function. **Avoid exception handling here**; let the Node's retry mechanism manage failures.
     - `post`: Write "embedding" to the shared store

6. **Implementation**: Implement the initial nodes and flows based on the design.
   - 🎉 If you've reached this step, humans have finished the design. Now *Agentic Coding* begins!
   - **"Keep it simple, stupid!"** Avoid complex features and full-scale type checking.
   - **FAIL FAST**! Leverage the built-in Node retry and fallback mechanisms to handle failures gracefully. This helps you quickly identify weak points in the system.
   - Add logging throughout the code to facilitate debugging.

7. **Optimization**:
   - **Use Intuition**: For a quick initial evaluation, human intuition is often a good start.
   - **Redesign Flow (Back to Step 3)**: Consider breaking down tasks further, introducing agentic decisions, or better managing input contexts.
   - If your flow design is already solid, move on to micro-optimizations:
     - **Prompt Engineering**: Use clear, specific instructions with examples to reduce ambiguity.
     - **In-Context Learning**: Provide robust examples for tasks that are difficult to specify with instructions alone.

   - > **You'll likely iterate a lot!** Expect to repeat Steps 3–6 hundreds of times.
     >
     > <div align="center"><img src="https://github.com/the-pocket/.github/raw/main/assets/success.png?raw=true" width="400"/></div>
     {: .best-practice }

8. **Reliability**
   - **Node Retries**: Add checks in the node `exec` to ensure outputs meet requirements, and consider increasing `max_retries` and `wait` times.
   - **Logging and Visualization**: Maintain logs of all attempts and visualize node results for easier debugging.
   - **Self-Evaluation**: Add a separate node (powered by an LLM) to review outputs when results are uncertain.

## Example TypeScript Project File Structure

```
my_project/
├── src/
│   ├── index.ts        # Main entry point
│   ├── types.ts        # Type definitions
│   ├── nodes.ts        # Node definitions
│   ├── flow.ts         # Flow related functionality
│   └── utils/          # Utility functions
│       └── callLlm.ts  # LLM API integration
├── docs/               # Documentation
│   └── design.md       # Design documentation
├── package.json        # Project dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

- **`package.json`**: Lists the TypeScript dependencies for the project.
  ```json
  {
    "dependencies": {
      "pocketflow": "^1.0.0",
      "yaml": "^2.0.0"
    }
  }
  ```

- **`docs/design.md`**: Contains project documentation for each step above. This should be *high-level* and *no-code*.
  ```markdown
  # Design Doc: Your Project Name

  > Please DON'T remove notes for AI

  ## Requirements

  > Notes for AI: Keep it simple and clear.
  > If the requirements are abstract, write concrete user stories

  ## Flow Design

  > Notes for AI:
  > 1. Consider the design patterns of agent, map-reduce, rag, and workflow. Apply them if they fit.
  > 2. Present a concise, high-level description of the workflow.

  ### Applicable Design Pattern:

  1. Map the file summary into chunks, then reduce these chunks into a final summary.
  2. Agentic file finder
    - *Context*: The entire summary of the file
    - *Action*: Find the file

  ### Flow high-level Design:

  1. **First Node**: This node is for ...
  2. **Second Node**: This node is for ...
  3. **Third Node**: This node is for ...

  ```mermaid
  flowchart TD
      firstNode[First Node] --> secondNode[Second Node]
      secondNode --> thirdNode[Third Node]
  ```
  ## Utility Functions

  > Notes for AI:
  > 1. Understand the utility function definition thoroughly by reviewing the doc.
  > 2. Include only the necessary utility functions, based on nodes in the flow.

  1. **Call LLM** (`src/utils/callLlm.ts`)
    - *Input*: prompt (string)
    - *Output*: response (string)
    - Generally used by most nodes for LLM tasks

  2. **Embedding** (`src/utils/getEmbedding.ts`)
    - *Input*: str
    - *Output*: a vector of 3072 floats
    - Used by the second node to embed text

  ## Node Design

  ### Shared Store

  > Notes for AI: Try to minimize data redundancy

  The shared store structure is organized as follows:

  ```typescript
  const shared = {
      "key": "value"
  };
  ```

  ### Node Steps

  > Notes for AI: Carefully decide whether to use Batch/Async Node/Flow.

  1. First Node
    - *Purpose*: Provide a short explanation of the node's function
    - *Type*: Decide between Regular, Batch, or Async
    - *Steps*:
      - *prep*: Read "key" from the shared store
      - *exec*: Call the utility function
      - *post*: Write "key" to the shared store

  2. Second Node
    ...
  ```


- **`src/utils/`**: Contains all utility functions.
  - It's recommended to dedicate one TypeScript file to each API call, for example `callLlm.ts` or `searchWeb.ts`.
  - Each file should also include a simple test function
  ```typescript
  // src/utils/callLlm.ts
  export async function callLlm(prompt: string): Promise<string> {
      // Implementation details
  }

  // Test function
  if (import.meta.url === 'file://') {
      await callLlm("Hello, how are you?");
  }
  ```

- **`src/nodes.ts`**: Contains all the node definitions.
  ```typescript
  // src/nodes.ts
  import { Node } from 'pocketflow';
  import { callLlm } from './utils/callLlm';

  export class GetQuestionNode extends Node {
      async exec(): Promise<string> {
          // Get question directly from user input
          const userQuestion = await this.promptUser("Enter your question: ");
          return user_question;
      }

      post(shared: Record<string, any>, prep_res: any, exec_res: string): string {
          // Store the user's question
          shared["question"] = exec_res;
          return "default";  // Go to the next node
      }
  }

  export class AnswerNode extends Node {
      prep(shared: Record<string, any>): any {
          // Read question from shared
          return shared["question"];
      }

      async exec(question: string): Promise<string> {
          // Call LLM to get the answer
          return await callLlm(question);
      }

      post(shared: Record<string, any>, prep_res: any, exec_res: string): void {
          // Store the answer in shared
          shared["answer"] = exec_res;
      }
  }
  ```
- **`src/flow.ts`**: Implements functions that create flows by importing node definitions and connecting them.
  ```typescript
  // src/flow.ts
  import { Flow } from 'pocketflow';
  import { GetQuestionNode, AnswerNode } from './nodes';

  export function createQAFlow(): Flow {
      // Create nodes
      const getQuestionNode = new GetQuestionNode();
      const answerNode = new AnswerNode();

      // Connect nodes in sequence
      getQuestionNode.connect(answerNode);

      // Create flow starting with input node
      return new Flow({ start: getQuestionNode });
  }
  ```
- **`src/index.ts`**: Serves as the project's entry point.
  ```typescript
  // src/index.ts
  import { createQAFlow } from './flow';

  // Example main function
  export async function main(): Promise<void> {
      const shared = {
          "question": undefined,  // Will be populated by GetQuestionNode from user input
          "answer": undefined     // Will be populated by AnswerNode
      };

      // Create the flow and run it
      const qaFlow = createQAFlow();
      await qaFlow.run(shared);
      console.log(`Question: ${shared['question']}`);
      console.log(`Answer: ${shared['answer']}`);
  }
  ```

## TypeScript-Specific Considerations

- **Type Safety**: Leverage TypeScript interfaces and type definitions for PocketFlow integration
- **Async/Await Patterns**: Use TypeScript's native async/await syntax for LLM calls
- **Module System**: Utilize ES6 modules for better code organization
- **Build Tools**: Compatible with modern TypeScript build tools (Vite, tsup, webpack, etc.)
- **Testing**: Use Jest or similar testing frameworks with TypeScript support

## Example TypeScript Patterns

```typescript
// Type definitions for shared store
interface SharedStore {
    question?: string;
    answer?: string;
    user?: {
        id: string;
        context?: Record<string, any>;
    };
    results?: Record<string, any>;
}

// Type-safe utility function
interface LLMConfig {
    apiKey: string;
    model: string;
    maxRetries?: number;
    waitTime?: number;
}

// Error handling with TypeScript
class SummarizeNode extends Node {
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        super({ maxRetries: 3, wait: 10 });
        this.config = config;
    }

    async exec(text: string): Promise<string> {
        try {
            return await this.callLLM(`Summarize: ${text}`, this.config);
        } catch (error) {
            console.error('LLM call failed:', error);
            throw error;
        }
    }

    exec_fallback(prep_res: string, error: Error): string {
        return "Summary unavailable due to error";
    }
}
```