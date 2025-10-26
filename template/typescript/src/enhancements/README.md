# TypeScript Enhancements

This directory contains TypeScript-specific enhancements to the base PocketFlow library.

## Purpose

The base PocketFlow library already provides excellent async support. These enhancements add TypeScript-specific features like:
- Type safety and validation
- Performance monitoring
- Decorators
- Modern TypeScript patterns

## Structure

- `type-safe-nodes.ts` - Enhanced nodes with type validation
- `observable-flows.ts` - Flows with event monitoring
- `decorators.ts` - Node and flow decorators
- `performance.ts` - Performance monitoring utilities

## Note

This is a replacement for the broken `src/async.ts` file. We build on the base library functionality rather than recreate it.