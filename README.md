# Newman Batch CLI

A powerful Node.js CLI wrapper for Newman that enables batch execution of multiple Postman collections from a folder with comprehensive reporting and all native Newman options.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Advanced Examples](#advanced-examples)
- [CLI Options](#cli-options)
  - [Custom Options](#custom-options)
  - [Newman Standard Options](#newman-standard-options)
- [Output and Reports](#output-and-reports)
- [Project Structure](#project-structure)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Newman Batch CLI is a command-line tool that extends Newman's functionality by allowing you to execute multiple Postman collections stored in a directory with a single command. It provides real-time progress tracking, colored console output, comprehensive error handling, and consolidated reporting across all collection runs.

## ✨ Features

- **Batch Execution**: Run multiple Postman collections from a directory automatically
- **Full Newman Compatibility**: All Newman CLI options are supported
- **Consolidated Reporting**: Generate unified reports across all collection executions
- **Real-time Progress**: Visual feedback with colored output and progress tracking
- **Error Handling**: Continue on failure or bail on first error
- **Collection Validation**: Automatically validates and filters valid Postman collections
- **Flexible Reporters**: Support for CLI, JSON, HTML, JUnit, and custom reporters
- **Environment Variables**: Global and environment variable support
- **Summary Statistics**: Detailed statistics per collection and overall summary

## 📦 Prerequisites

- Node.js (v14.x or higher)
- npm (v6.x or higher)

## 🚀 Installation

### Local Installation

1. Clone or create the project directory:

```
mkdir newman-batch-cli
cd newman-batch-cli
```

2. Create the project structure:

```
mkdir bin
touch package.json index.js bin/newman-batch.js README.md
```

3. Install dependencies:

```
npm install
```

4. Make the CLI executable (Unix/Mac/Linux):

```
chmod +x bin/newman-batch.js
```

5. Link globally (optional):

```
npm link
```

### Global Installation (After Publishing to npm)

```
npm install -g newman-batch-cli
```

## 💻 Usage

### Basic Usage

Run all collections in a directory:

```
newman-batch --source ./collections
```

### Advanced Examples

#### With Environment File

```
newman-batch --source ./collections --environment ./environments/dev.json
```

#### With Multiple Reporters and Report Output

```
newman-batch --source ./collections \
  --report output.json \
  -r cli,json,html \
  --reporter-json-export results.json \
  --reporter-html-export report.html
```

#### With Globals and Environment Variables

```
newman-batch --source ./collections \
  --globals ./globals.json \
  --global-var "baseUrl=https://api.example.com" \
  --env-var "apiKey=secret123"
```

#### With Iterations and Delays

```
newman-batch --source ./collections \
  --iteration-count 5 \
  --delay-request 1000 \
  --timeout-request 10000
```

#### Stop on First Failure

```
newman-batch --source ./collections --bail
```

#### With SSL Configuration

```
newman-batch --source ./collections \
  --ssl-client-cert ./certs/client.crt \
  --ssl-client-key ./certs/client.key \
  --insecure
```

## 🔧 CLI Options

### Custom Options

These are additional options specific to Newman Batch CLI:

| Option | Description | Required |
|--------|-------------|----------|
| `--source <path>` | Path to folder containing Postman collection JSON files | **Yes** |
| `--report <filename>` | Output consolidated report file name (JSON format) | No |

### Newman Standard Options

All standard Newman options are fully supported:

#### Collection and Data

| Option | Description |
|--------|-------------|
| `-e, --environment <path>` | Path to Postman environment JSON file |
| `-g, --globals <path>` | Path to Postman globals JSON file |
| `-d, --iteration-data <path>` | Path to iteration data file (CSV or JSON) |
| `-n, --iteration-count <n>` | Number of iterations to run |
| `--folder <name>` | Run requests within a specific folder only |

#### Execution Control

| Option | Description |
|--------|-------------|
| `--timeout <ms>` | Global timeout for the entire collection run (milliseconds) |
| `--timeout-request <ms>` | Timeout for individual requests (milliseconds) |
| `--timeout-script <ms>` | Timeout for pre-request and test scripts (milliseconds) |
| `--delay-request <ms>` | Delay between requests (milliseconds) |
| `--bail` | Stop execution on first error or test failure |
| `--suppress-exit-code` | Continue returning exit code 0 even on failures |

#### Output Control

| Option | Description |
|--------|-------------|
| `--color <option>` | Enable/disable colored output (`auto`, `on`, `off`) |
| `--disable-unicode` | Disable unicode characters in output |
| `--verbose` | Show detailed information during execution |

#### Reporters

| Option | Description |
|--------|-------------|
| `-r, --reporters <reporters>` | Comma-separated list of reporters (`cli,json,html,junit`) |
| `--reporter-json-export <path>` | Export JSON report to specified file |
| `--reporter-html-export <path>` | Export HTML report to specified file |
| `--reporter-junit-export <path>` | Export JUnit XML report to specified file |
| `--reporter-cli-silent` | Disable CLI reporter output |
| `--reporter-cli-no-summary` | Disable summary in CLI output |
| `--reporter-cli-no-failures` | Disable failure details in CLI output |
| `--reporter-cli-no-assertions` | Disable assertion details in CLI output |
| `--reporter-cli-no-console` | Disable console.log output from scripts |

#### SSL and Security

| Option | Description |
|--------|-------------|
| `-k, --insecure` | Disable SSL certificate verification |
| `--ssl-client-cert <path>` | Path to client SSL certificate |
| `--ssl-client-key <path>` | Path to client SSL key |
| `--ssl-client-passphrase <passphrase>` | Passphrase for client SSL certificate |
| `--ssl-extra-ca-certs <path>` | Path to additional CA certificates |

#### HTTP Options

| Option | Description |
|--------|-------------|
| `--ignore-redirects` | Disable automatic following of HTTP redirects |
| `--cookie-jar <path>` | Path to cookie jar file |
| `--export-cookie-jar <path>` | Export cookies to file after run |

#### Export Options

| Option | Description |
|--------|-------------|
| `--export-environment <path>` | Export final environment values to file |
| `--export-globals <path>` | Export final global values to file |
| `--export-collection <path>` | Export executed collection to file |

#### Variables

| Option | Description |
|--------|-------------|
| `--global-var <key=value>` | Define global variable (can be used multiple times) |
| `--env-var <key=value>` | Define environment variable (can be used multiple times) |

#### Working Directory

| Option | Description |
|--------|-------------|
| `--working-dir <path>` | Path to working directory for file operations |
| `--no-insecure-file-read` | Prevent reading files outside working directory |

## 📊 Output and Reports

### Console Output

The CLI provides colored, formatted output showing:

- Collection scanning progress
- Validation results
- Real-time execution progress for each collection
- Request and assertion statistics per collection
- Final consolidated summary

### Consolidated Report

Use the `--report` option to generate a JSON report containing:

```
{
  "timestamp": "2025-11-18T17:28:00.000Z",
  "totalCollections": 5,
  "successfulCollections": 4,
  "failedCollections": 1,
  "results": [
    {
      "collection": "api-tests.json",
      "success": true,
      "stats": {
        "requests": { "total": 10, "failed": 0 },
        "assertions": { "total": 25, "failed": 0 }
      }
    }
  ]
}
```

### Individual Collection Reports

Use Newman's built-in reporters for individual collection reports:

```
newman-batch --source ./collections \
  -r cli,html,json \
  --reporter-html-export ./reports/html-report.html \
  --reporter-json-export ./reports/json-report.json
```

## 📁 Project Structure

```
newman-batch-cli/
├── package.json              # Project dependencies and metadata
├── index.js                  # Core logic and functions
├── bin/
│   └── newman-batch.js      # CLI entry point
├── README.md                 # Project documentation
└── node_modules/             # Installed dependencies
```

## 📝 Examples

### Example 1: Simple Batch Run

```
newman-batch --source ./my-collections
```

### Example 2: Production Test Suite

```
newman-batch --source ./test-suites/production \
  --environment ./environments/prod.json \
  --globals ./globals/prod-globals.json \
  --report ./reports/prod-results.json \
  -r cli,html,junit \
  --reporter-html-export ./reports/prod-report.html \
  --reporter-junit-export ./reports/prod-junit.xml \
  --bail
```

### Example 3: Load Testing with Iterations

```
newman-batch --source ./load-tests \
  --iteration-count 100 \
  --delay-request 500 \
  --timeout-request 30000 \
  --reporter-cli-no-console
```

### Example 4: CI/CD Pipeline Integration

```
newman-batch --source ./collections \
  --environment ./env/ci.json \
  --reporters cli,junit \
  --reporter-junit-export ./test-results/junit.xml \
  --bail \
  --suppress-exit-code
```

### Example 5: Debug Mode with Verbose Output

```
newman-batch --source ./collections \
  --environment ./env/dev.json \
  --verbose \
  --reporter-cli-no-summary
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

---

## 🔗 Related Resources

- [Newman Documentation](https://learning.postman.com/docs/running-collections/using-newman-cli/command-line-integration-with-newman/)
- [Postman Collections](https://learning.postman.com/docs/collections/collections-overview/)
- [Newman npm Package](https://www.npmjs.com/package/newman)
- [Commander.js Documentation](https://github.com/tj/commander.js)

## 💡 Tips and Best Practices

1. **Organization**: Keep your collections organized in separate folders for different test suites
2. **Environments**: Use environment files to separate configurations for different stages (dev, staging, production)
3. **CI/CD**: Integrate with your CI/CD pipeline using the `--bail` and JUnit reporter options
4. **Reporting**: Use multiple reporters to get different views of your test results
5. **Performance**: Use `--delay-request` to avoid overwhelming your API servers
6. **Security**: Store sensitive data in environment/global variables, not in collections

## 🐛 Troubleshooting

### Collections Not Found

Ensure your `--source` path is correct and contains `.json` files.

### Invalid Collection Format

The tool validates Postman collection format. Ensure your JSON files are valid Postman v2.0 or v2.1 collections.

### Permission Denied

On Unix systems, ensure the CLI script is executable: `chmod +x bin/newman-batch.js`

### Module Not Found

Run `npm install` to ensure all dependencies are installed.

---

**Made with ❤️ for API Testing Automation**