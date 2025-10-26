# Create PocketFlow

A CLI tool to easily create PocketFlow projects using templates. This is **not** a PocketFlow project itself - it's a command-line tool that generates new projects from templates.

## What This Is

- **CLI Tool**: Creates new PocketFlow projects from templates (similar to `create-react-app`)
- **Template-Based**: Currently provides a TypeScript template with AI-assisted development support
- **Multi-Template Architecture**: Designed to support multiple languages and project types in the future

## Project Structure

```
create-pocketflow/
├── bin/                    # CLI entry points
├── lib/                    # CLI implementation
└── template/               # Project templates
    └── typescript/         # TypeScript project template
        ├── CLAUDE.md       # AI assistant instructions for TypeScript
        ├── src/            # Source code structure
        ├── docs/           # Documentation structure
        └── package.json    # Template dependencies
```

## Usage

### Quick Start
```bash
# Create a new PocketFlow TypeScript project
npx create-pocketflow my-app

# Or use interactively (will prompt for project name)
npx create-pocketflow
```

### What Gets Created
When you run the CLI, it:
1. **Copies the template** from `template/typescript/` to your new project directory
2. **Initializes** with your preferred package manager (npm, yarn, pnpm, bun)
3. **Sets up** the complete project structure with TypeScript configuration
4. **Includes AI assistance** via the copied `CLAUDE.md` file

### Example
```bash
npx create-pocketflow my-ai-assistant
# Creates:
# my-ai-assistant/
# ├── CLAUDE.md          # TypeScript-specific AI guidance
# ├── src/
# │   ├── index.ts       # Entry point
# │   ├── nodes.ts       # Node definitions
# │   ├── flow.ts        # Flow creation
# │   └── utils/         # Utility functions
# ├── docs/
# │   └── PRD.md         # Design documentation
# └── package.json       # Project dependencies
```

## Features

- **Template-Based Generation**: Creates new PocketFlow projects from ready-made templates
- **Interactive Setup**: Command-line interface for customizing project configuration
- **Package Manager Support**: Works with npm, yarn, pnpm, bun, and deno
- **AI-Assisted Development**: Includes specialized AI assistant guidance in each template
- **Complete Project Structure**: Sets up source code, documentation, and configuration files

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/create-pocketflow.git
cd create-pocketflow

# Install dependencies
npm install

# Link the package globally for local testing
npm link

# Now you can use it like this
create-pocketflow my-test-app
```

## Publishing

```bash
# Login to npm
npm login

# Publish the package
npm publish
```

## Future Features

- [ ] **JavaScript Template**: Add support for pure JavaScript projects
- [x] **Package Manager Support**: Support for npm, yarn, pnpm, bun, deno
- [ ] **Project Types**: Support for libraries, full-stack apps, APIs
- [ ] **Template Customization**: Interactive template configuration options
- [ ] **Multi-Language Support**: Python, Go, Rust templates
- [ ] **Template Registry**: Community-contributed templates

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/PocketFlow-Template-Typescript.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Commit your changes: `git commit -m 'Add some amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## License

MIT
