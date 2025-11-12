# PolyX Supreme v1.0 - Autonomous Coding Agent

An autonomous, self-improving coding agent with recursive reasoning capabilities designed to solve complex problems through iterative planning, execution, testing, and reflection.

## Overview

PolyX Supreme v1.0 is a sophisticated agent framework that follows a structured 5-phase approach to problem-solving:

1. **Problem Deconstruction** - Analyzes and understands the task
2. **Strategy Planning** - Creates an execution plan
3. **Implementation** - Generates code with tests
4. **Self-Review** - Evaluates quality and calculates confidence
5. **Output Format** - Delivers structured results

## Core Principles

### System Rules

1. Operates as an autonomous coding agent, not a chatbot
2. All outputs derive from a SPEC or user-provided TASK
3. Only generates code when confidence ≥ CONFIDENCE_TARGET and spec_drift_score == 0
4. Uses recursive planning, implementation, and reflection loops
5. Never skips validation or reasoning phases

### Confidence Model

The agent calculates confidence scores using a weighted formula:

```
confidence = 0.25 × completeness +
             0.25 × logic_coherence +
             0.20 × test_coverage +
             0.15 × domain_familiarity +
             0.15 × simplicity -
             0.05 × spec_drift_score
```

If confidence < target, the agent retries with a refined approach.

## Usage

### Basic Example

```typescript
import { PolyXAgent } from '@/core/polyx-agent';

// Create and execute agent
const agent = new PolyXAgent();

const result = await agent.execute(
  {
    description: 'Implement a tokenizer that splits input text into lowercase alphanumeric tokens',
    requirements: [
      'Remove all punctuation',
      'Convert to lowercase',
      'Split on whitespace'
    ],
    constraints: [
      'Handle empty strings',
      'Preserve word order'
    ]
  },
  {
    mode: 'verified',
    confidenceTarget: 0.95,
    maxRetries: 2
  }
);

if ('code' in result) {
  // Success - use the generated code
  console.log(result.code);
  console.log(`Confidence: ${result.confidenceScore}`);
} else {
  // Error occurred
  console.error(result.error);
}
```

### Quick Activation

For simpler usage, use the static `activate` method:

```typescript
import { PolyXAgent } from '@/core/polyx-agent';

const result = await PolyXAgent.activate({
  task: 'Create a validation function for email addresses',
  requirements: ['Support common email formats', 'Return boolean'],
  mode: 'verified',
  confidenceTarget: 0.95,
  maxRetries: 2
});
```

## Modes

### Verified Mode (Default)

- Generates comprehensive test coverage
- Detailed reasoning digest
- Higher confidence gate (0.95 recommended)
- Full documentation

```typescript
const config = {
  mode: 'verified',
  confidenceTarget: 0.95,
  maxRetries: 2
};
```

### Fast Mode

- Skips test generation unless explicitly requested
- Simplified reasoning digest
- Lower confidence gate (0.80 recommended)
- Terser code output

```typescript
const config = {
  mode: 'fast',
  confidenceTarget: 0.80,
  maxRetries: 2
};
```

## Output Format

The agent produces structured output in the following format:

```typescript
interface AgentOutput {
  attempt: number;                    // Iteration number
  confidenceScore: number;            // 0.0 - 1.0
  reasoningDigest: string;            // Summary of approach
  code: string;                       // Generated implementation
  tests?: string;                     // Test suite (verified mode)
  checklist: {
    specAligned: boolean;
    invariantsCovered: boolean;
    driftScoreZero: boolean;
    securityAndPolicySafe: boolean;
    confidenceAboveTarget: boolean;
  };
  iterations?: IterationLog[];       // Retry history
}
```

### YAML Format

```typescript
import { OutputFormatPhase } from '@/core/polyx-agent';

const formatter = new OutputFormatPhase();
const yaml = formatter.formatAsYAML(result);
console.log(yaml);
```

Output:
```yaml
attempt: 1
confidence_score: 0.95
reasoning_digest: |
  ## What Was Done
  - Implementation generated according to specification
  
  ## What Works
  - Implementation is complete
  - Logic is coherent
  
  ## What Might Break
  - No major issues identified
code: |
  // Generated code here
tests: |
  // Generated tests here
checklist: |
  - SPEC aligned: ☑
  - Invariants covered: ☑
  - Drift score == 0: ☑
  - Security & policy safe: ☑
  - Confidence ≥ target: ☑
```

## Phase Details

### Phase 1: Problem Deconstruction

Analyzes the task specification and identifies:
- Restatement of the problem
- Known information
- Unknown factors
- Assumptions
- Ambiguities requiring clarification

### Phase 2: Strategy Planning

Creates an execution plan by:
- Breaking down into components
- Ranking by complexity and dependencies
- Predicting edge cases
- Identifying potential failure points

### Phase 3: Implementation

Generates:
- Core implementation code
- Test suite (in verified mode)
- Documentation
- Critical reasoning notes

### Phase 4: Self-Review

Evaluates implementation through:
- Confidence score calculation
- Completeness audit
- Logic coherence check
- Test coverage assessment
- Issue identification
- Improvement suggestions

### Phase 5: Output Format

Delivers results in:
- Structured format
- YAML representation
- JSON representation
- Comprehensive checklist

## Retry Logic

The agent automatically retries if:
- Confidence score < target
- Spec drift detected
- Maximum retries not exceeded

Each iteration learns from previous attempts to improve the solution.

## Example Scenarios

### Simple Task

```typescript
await PolyXAgent.activate({
  task: 'Create a function to calculate factorial',
  mode: 'fast',
  confidenceTarget: 0.80
});
```

### Complex Task with Requirements

```typescript
await PolyXAgent.activate({
  task: 'Implement a robust user authentication system',
  requirements: [
    'Hash passwords securely',
    'Validate email format',
    'Generate secure session tokens',
    'Handle concurrent login attempts'
  ],
  constraints: [
    'Use industry-standard algorithms',
    'No external dependencies',
    'Performance optimized'
  ],
  mode: 'verified',
  confidenceTarget: 0.95,
  maxRetries: 3
});
```

## Testing

Run the agent tests:

```bash
npm test src/core/polyx-agent/test
```

## Architecture

```
polyx-agent/
├── types.ts                    # Type definitions
├── index.ts                    # Main orchestrator
├── phase1-deconstruction.ts    # Problem analysis
├── phase2-strategy.ts          # Planning
├── phase3-implementation.ts    # Code generation
├── phase4-review.ts           # Quality assessment
├── phase5-output.ts           # Result formatting
└── test/
    └── agent.test.ts          # Comprehensive tests
```

## Integration with Mental Scribe

This agent framework can be used within Mental Scribe for:
- Automated clinical note template generation
- Custom validation rule creation
- Report format customization
- Data transformation logic generation

## Security Considerations

- All generated code is automatically reviewed for security issues
- Checklist includes security verification
- No external code execution during generation
- Sanitized output format

## Future Enhancements

- [ ] Integration with external code quality tools
- [ ] Support for multiple programming languages
- [ ] Enhanced domain-specific knowledge bases
- [ ] Interactive clarification requests
- [ ] Machine learning-based confidence refinement

## License

Part of the Mental Scribe application - see main LICENSE file.
