# PocketFlow-Template-Typescript

A TypeScript template for creating PocketFlow applications.

## Features

- TypeScript configuration
- ESLint and Prettier setup
- Jest testing framework
- Basic project structure
- Example utility functions and types

## Getting Started

### Installation

```bash
npx create-pocketflow --template typescript
```

### Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run development mode with watch
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
.
├── src/
│   ├── index.ts        # Main entry point
│   ├── types.ts        # Type definitions
│   ├── utils.ts        # Utility functions
│   └── *.test.ts       # Test files
├── dist/               # Compiled output
├── .eslintrc.json      # ESLint configuration
├── .prettierrc         # Prettier configuration
├── jest.config.js      # Jest configuration
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

## Customizing the Template

You can customize this template to fit your specific needs by:

1. Modifying the TypeScript configuration in `tsconfig.json`
2. Updating ESLint rules in `.eslintrc.json`
3. Adjusting Prettier settings in `.prettierrc`
4. Adding more dependencies to `package.json`

## License

MIT