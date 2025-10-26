# Test Suite Structure

This directory contains the comprehensive test suite for the PocketFlow TypeScript template.

## Structure

```
test/
├── unit/          # Unit tests for individual components
├── integration/   # Integration tests for component interactions
├── e2e/          # End-to-end tests for complete workflows
├── performance/  # Performance benchmarks and tests
└── README.md     # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run tests with coverage
npm run test:coverage
```

## Test Philosophy

- **Unit Tests (70%)**: Test individual nodes, flows, and utility functions
- **Integration Tests (20%)**: Test component interactions and workflow patterns
- **E2E Tests (10%)**: Test complete real-world scenarios
- **Performance Tests**: Validate performance benchmarks and memory usage

## Adding Tests

When adding new features, ensure corresponding tests are added to the appropriate category.

- **New Node Class**: Add unit tests in `unit/nodes/`
- **New Flow Pattern**: Add integration tests in `integration/flows/`
- **New Workflow**: Add e2e tests in `e2e/workflows/`
- **Performance Changes**: Add benchmarks in `performance/`