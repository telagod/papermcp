# Contributing to Paper Search MCP

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/paper-search-mcp.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Test your changes: `npm run build && npm test`
6. Commit: `git commit -m "feat: add amazing feature"`
7. Push: `git push origin feature/your-feature`
8. Open a Pull Request

## Development Setup

```bash
cd ts
npm install
npm run build
npm run dev
```

## Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

## Adding a New Platform

1. Create adapter in `ts/src/platforms/`
2. Add platform ID to `ts/src/core/types.ts`
3. Register in `ts/src/platforms/index.ts`
4. Update README with platform info
5. Add tests if applicable

## Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Update documentation
- Add tests for new features
- Ensure all tests pass
- Follow code style guidelines

## Questions?

Open an issue or discussion on GitHub.
