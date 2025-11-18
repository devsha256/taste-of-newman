#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const { runCollections } = require('../index');

program
  .name('newman-batch')
  .description('Batch execute Postman collections using Newman')
  .version('1.0.0');

// Custom options
program
  .option('--source <path>', 'Path to folder containing Postman collection JSON files (required)')
  .option('--report <filename>', 'Output report file name');

// Newman standard options
program
  .option('-e, --environment <path>', 'Path to environment file')
  .option('-g, --globals <path>', 'Path to globals file')
  .option('-d, --iteration-data <path>', 'Path to iteration data file')
  .option('-n, --iteration-count <n>', 'Number of iterations', parseInt)
  .option('--folder <name>', 'Run requests within a specific folder')
  .option('--working-dir <path>', 'Path to working directory')
  .option('--no-insecure-file-read', 'Prevent reading files outside working directory')
  .option('--export-environment <path>', 'Export environment to a file')
  .option('--export-globals <path>', 'Export globals to a file')
  .option('--export-collection <path>', 'Export collection to a file')
  .option('--timeout <ms>', 'Request timeout in milliseconds', parseInt)
  .option('--timeout-request <ms>', 'Individual request timeout', parseInt)
  .option('--timeout-script <ms>', 'Script timeout', parseInt)
  .option('--delay-request <ms>', 'Delay between requests in milliseconds', parseInt)
  .option('--bail', 'Stop on first error')
  .option('--suppress-exit-code', 'Continue on error')
  .option('--color <option>', 'Enable/disable colored output (auto|on|off)', 'auto')
  .option('--disable-unicode', 'Disable unicode symbols')
  .option('-k, --insecure', 'Disable SSL verification')
  .option('--ignore-redirects', 'Prevent following redirects')
  .option('--verbose', 'Show detailed information')
  .option('-r, --reporters <reporters>', 'Comma-separated list of reporters (cli,json,html,junit)', 'cli')
  .option('--reporter-json-export <path>', 'Export JSON report to file')
  .option('--reporter-html-export <path>', 'Export HTML report to file')
  .option('--reporter-junit-export <path>', 'Export JUnit report to file')
  .option('--reporter-cli-silent', 'Disable CLI output')
  .option('--reporter-cli-no-summary', 'Disable summary in CLI')
  .option('--reporter-cli-no-failures', 'Disable failure details in CLI')
  .option('--reporter-cli-no-assertions', 'Disable assertion details in CLI')
  .option('--reporter-cli-no-console', 'Disable console logs in CLI')
  .option('--ssl-client-cert <path>', 'Path to client certificate')
  .option('--ssl-client-key <path>', 'Path to client key')
  .option('--ssl-client-passphrase <passphrase>', 'Client certificate passphrase')
  .option('--ssl-extra-ca-certs <path>', 'Path to extra CA certificates')
  .option('--cookie-jar <path>', 'Path to cookie jar file')
  .option('--export-cookie-jar <path>', 'Export cookies to file')
  .option('--global-var <key=value>', 'Global variable (can be used multiple times)', collect, [])
  .option('--env-var <key=value>', 'Environment variable (can be used multiple times)', collect, []);

program.parse(process.argv);

const options = program.opts();

// Validate required option
if (!options.source) {
  console.error('Error: --source option is required');
  console.log('Usage: newman-batch --source <path-to-collections-folder> [options]');
  process.exit(1);
}

// Helper function to collect multiple values
function collect(value, previous) {
  return previous.concat([value]);
}

// Run the batch collections
runCollections(options)
  .then(() => {
    console.log('\n✓ All collections executed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error executing collections:', error.message);
    process.exit(1);
  });
