# Contributing to SentryGuard

Thank you for your interest in contributing to SentryGuard! We welcome all contributions from the community.

## 📋 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🚀 How to Contribute

### Reporting a Bug

If you find a bug, please create an issue with:
- A clear description of the problem
- Steps to reproduce the bug
- Expected behavior vs actual behavior
- Your environment (OS, Node.js version, etc.)
- Screenshots if applicable

### Proposing a New Feature

To propose a new feature:
1. First check if it doesn't already exist in the issues
2. Create an issue with the `enhancement` label
3. Clearly describe the use case and benefits
4. Wait for community feedback before starting development

### Submitting a Pull Request

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/your-username/SentryGuard.git
   cd SentryGuard
   ```

3. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/my-new-feature
   ```

4. **Install dependencies**:
   ```bash
   yarn install
   ```

5. **Make your changes** following our code standards

6. **Test your code**:
   ```bash
   # Unit tests
   npx nx test api
   npx nx test webapp
   
   # Linting
   npx nx lint api
   npx nx lint webapp
   
   # Build
   npx nx build api
   npx nx build webapp
   ```

7. **Commit your changes** with clear messages:
   ```bash
   git commit -m "feat: add feature X"
   ```
   
   Use [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` for a new feature
   - `fix:` for a bug fix
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for refactoring
   - `test:` for tests
   - `chore:` for maintenance tasks

8. **Push** to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```

9. **Create a Pull Request** on GitHub

## 🔍 Code Standards

### TypeScript

- Use TypeScript strict mode
- Always type function parameters and returns
- Avoid `any`, prefer `unknown` if necessary
- Use interfaces for complex types

### Style

- Follow the project's ESLint rules
- Use Prettier for formatting (automatic)
- camelCase naming for variables and functions
- PascalCase naming for classes and components

### Tests

- Write tests for all new features
- Maintain code coverage > 80%
- Tests must be isolated and reproducible
- Use mocks for external dependencies

### Documentation

- Document complex functions with JSDoc
- Update README if necessary
- Add comments for non-obvious logic
- Document new environment variables

## 🏗️ Project Structure

```
SentryGuard/
├── apps/
│   ├── api/          # NestJS Backend
│   └── webapp/       # Next.js Frontend
└── README.md         # Main documentation
```

## 🧪 Tests

### Running tests

```bash
# All tests
npx nx test api
npx nx test webapp

# Watch mode
npx nx test api --watch

# With coverage
npx nx test api --coverage
```

### Writing tests

- Place tests next to source files (`.spec.ts`)
- Use Jest for unit tests
- Mock external dependencies (DB, Tesla API, Telegram)
- Test normal cases AND error cases

## 📝 Review Process

1. A maintainer will review your PR within 48h
2. Changes may be requested
3. Once approved, your PR will be merged
4. Your contribution will be listed in the CHANGELOG

## 🐛 Security

**Never commit secrets or tokens in the code!**

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md).

## 💬 Questions?

- Open an issue with the `question` label
- Check the [documentation](README.md)

> **Note**: A detailed setup guide with Docker support is coming soon!

## 🙏 Acknowledgments

Thanks to all contributors who help improve SentryGuard!

## 📄 License

By contributing to SentryGuard, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
