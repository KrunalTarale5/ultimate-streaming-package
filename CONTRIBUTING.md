# Contributing to Ultimate Streaming Package

Thank you for your interest in contributing to the Ultimate Streaming Package! We welcome contributions from the community and are excited to work with you.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [krunaltarale555@gmail.com](mailto:krunaltarale555@gmail.com).

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/ultimate-streaming-package.git
   cd ultimate-streaming-package
   ```
3. **Add the original repository** as upstream:
   ```bash
   git remote add upstream https://github.com/krunaltarale/ultimate-streaming-package.git
   ```

## Development Setup

### Prerequisites
- Node.js 14.0.0 or higher
- npm 6.0.0 or higher
- MongoDB (for testing MongoDB features)
- MySQL (for testing MySQL features)

### Installation
```bash
# Install dependencies
npm install

# Run the demo to verify setup
npm run demo
```

### Environment Setup
Create a `.env` file in the root directory:
```env
MONGODB_URI=mongodb://localhost:27017/test
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=test
```

## How to Contribute

### Reporting Bugs
- Use the GitHub issue tracker
- Include detailed steps to reproduce
- Provide system information (Node.js version, OS, etc.)
- Include relevant error messages and logs

### Suggesting Features
- Use GitHub issues with the "enhancement" label
- Provide detailed use cases and benefits
- Consider implementation complexity and backward compatibility

### Contributing Code
1. **Pick an issue** from the issue tracker or create one
2. **Create a branch** from main:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Test your changes** thoroughly
5. **Update documentation** if necessary
6. **Commit your changes** with descriptive messages
7. **Push to your fork** and create a pull request

## Pull Request Process

### Before Submitting
- [ ] Code follows our coding standards
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Commit messages are descriptive

### PR Requirements
- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Link to related issue** (if applicable)
- **Screenshots** for UI changes
- **Performance impact** assessment for core features

### Review Process
1. Automated tests must pass
2. Code review by maintainers
3. Performance impact assessment
4. Documentation review
5. Final approval and merge

## Coding Standards

### JavaScript/Node.js
- Use ES6+ features where appropriate
- Follow consistent indentation (2 spaces)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Handle errors appropriately

### Example:
```javascript
/**
 * Creates a new streaming connection with optimized performance
 * @param {Object} config - Configuration options
 * @param {string} config.database - Database type ('mongodb' or 'mysql')
 * @param {Object} config.connection - Connection parameters
 * @returns {Promise<UltimateStreamer>} Configured streamer instance
 */
async function createStreamer(config) {
  try {
    // Implementation
  } catch (error) {
    logger.error('Failed to create streamer:', error);
    throw error;
  }
}
```

### TypeScript Definitions
- Keep `index.d.ts` updated with all public APIs
- Use proper TypeScript types (avoid `any`)
- Document complex types with JSDoc

## Testing Guidelines

### Running Tests
```bash
# Run all tests
npm test

# Run performance benchmarks
npm run benchmark

# Run stress tests
npm run stress-test
```

### Writing Tests
- Write tests for new features
- Include edge cases and error scenarios
- Test with both MongoDB and MySQL
- Performance tests for core streaming features

### Test Structure
```javascript
describe('UltimateStreamer', () => {
  describe('MongoDB integration', () => {
    it('should handle change streams correctly', async () => {
      // Test implementation
    });
    
    it('should fallback gracefully on errors', async () => {
      // Test implementation
    });
  });
});
```

## Documentation

### Updating Documentation
- Update relevant files in the `docs/` directory
- Keep README.md current with new features
- Update API reference for new methods
- Include code examples for new features

### Documentation Standards
- Use clear, concise language
- Include working code examples
- Provide both basic and advanced usage patterns
- Update architecture diagrams when needed

## Performance Considerations

### Core Performance Rules
- All database operations must be non-blocking
- Memory usage should be optimized for long-running processes
- Connection pooling must be efficient
- Caching strategies should be documented

### Benchmarking New Features
```bash
# Before making changes
npm run benchmark > before.txt

# After making changes
npm run benchmark > after.txt

# Compare results
diff before.txt after.txt
```

## Database Support

### Adding New Database Support
1. Create connector in `lib/` directory
2. Implement standard interface methods
3. Add TypeScript definitions
4. Create comprehensive tests
5. Update documentation
6. Add to benchmarking suite

### Database Connector Interface
```javascript
class DatabaseConnector {
  async connect(config) { /* Implementation */ }
  async startStreaming(options) { /* Implementation */ }
  async stopStreaming() { /* Implementation */ }
  on(event, callback) { /* Implementation */ }
}
```

## Release Process

### Version Management
- Follow [Semantic Versioning](https://semver.org/)
- Update CHANGELOG.md with all changes
- Tag releases appropriately

### Pre-release Checklist
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Performance benchmarks show no regression
- [ ] CHANGELOG.md is updated
- [ ] Version number is bumped

## Community

### Getting Help
- **GitHub Issues**: For bugs and feature requests
- **Email**: [krunaltarale555@gmail.com](mailto:krunaltarale555@gmail.com) for general questions
- **Documentation**: Check the `docs/` directory for detailed guides

### Recognition
Contributors will be recognized in:
- CHANGELOG.md for their contributions
- GitHub contributors list
- Special acknowledgments for significant contributions

## Package Maintenance

### Maintainer Responsibilities
- **Krunal Tarale** - Creator and lead maintainer
- Response time: 24-48 hours for issues
- Code review: All PRs reviewed within 1 week
- Releases: Monthly release cycle with hotfixes as needed

Thank you for contributing to the Ultimate Streaming Package! Your contributions help make real-time data streaming better for everyone.

---

**Questions?** Feel free to reach out to [krunaltarale555@gmail.com](mailto:krunaltarale555@gmail.com) 