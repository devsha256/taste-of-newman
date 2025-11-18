const newman = require('newman');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Parse key=value pairs into an object
 */
function parseKeyValuePairs(pairs) {
  if (!pairs || pairs.length === 0) return undefined;
  
  const result = {};
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      result[key] = value;
    }
  });
  return result;
}

/**
 * Build Newman options from CLI options
 */
function buildNewmanOptions(cliOptions, collectionPath) {
  const newmanOptions = {
    collection: collectionPath,
    reporters: cliOptions.reporters ? cliOptions.reporters.split(',') : ['cli']
  };

  // Environment and globals
  if (cliOptions.environment) newmanOptions.environment = cliOptions.environment;
  if (cliOptions.globals) newmanOptions.globals = cliOptions.globals;
  
  // Iteration data
  if (cliOptions.iterationData) newmanOptions.iterationData = cliOptions.iterationData;
  if (cliOptions.iterationCount) newmanOptions.iterationCount = cliOptions.iterationCount;
  
  // Folder
  if (cliOptions.folder) newmanOptions.folder = cliOptions.folder;
  
  // Working directory
  if (cliOptions.workingDir) newmanOptions.workingDir = cliOptions.workingDir;
  
  // Timeouts
  if (cliOptions.timeout || cliOptions.timeoutRequest || cliOptions.timeoutScript) {
    newmanOptions.timeout = {};
    if (cliOptions.timeout) newmanOptions.timeout.global = cliOptions.timeout;
    if (cliOptions.timeoutRequest) newmanOptions.timeout.request = cliOptions.timeoutRequest;
    if (cliOptions.timeoutScript) newmanOptions.timeout.script = cliOptions.timeoutScript;
  }
  
  // Delay
  if (cliOptions.delayRequest) newmanOptions.delayRequest = cliOptions.delayRequest;
  
  // Bail options
  if (cliOptions.bail) newmanOptions.bail = true;
  if (cliOptions.suppressExitCode) newmanOptions.suppressExitCode = true;
  
  // Color
  if (cliOptions.color) newmanOptions.color = cliOptions.color;
  
  // SSL options
  if (cliOptions.insecure) newmanOptions.insecure = true;
  if (cliOptions.ignoreRedirects) newmanOptions.ignoreRedirects = true;
  
  // SSL certificates
  if (cliOptions.sslClientCert || cliOptions.sslClientKey) {
    newmanOptions.sslClientCert = cliOptions.sslClientCert;
    newmanOptions.sslClientKey = cliOptions.sslClientKey;
    if (cliOptions.sslClientPassphrase) {
      newmanOptions.sslClientPassphrase = cliOptions.sslClientPassphrase;
    }
  }
  
  if (cliOptions.sslExtraCaCerts) {
    newmanOptions.sslExtraCaCerts = cliOptions.sslExtraCaCerts;
  }
  
  // Cookie jar
  if (cliOptions.cookieJar) newmanOptions.cookieJar = cliOptions.cookieJar;
  if (cliOptions.exportCookieJar) newmanOptions.exportCookieJar = cliOptions.exportCookieJar;
  
  // Export options
  if (cliOptions.exportEnvironment) newmanOptions.exportEnvironment = cliOptions.exportEnvironment;
  if (cliOptions.exportGlobals) newmanOptions.exportGlobals = cliOptions.exportGlobals;
  if (cliOptions.exportCollection) newmanOptions.exportCollection = cliOptions.exportCollection;
  
  // Reporter options
  const reporterOptions = {};
  
  if (cliOptions.reporterJsonExport) {
    reporterOptions.json = { export: cliOptions.reporterJsonExport };
  }
  
  if (cliOptions.reporterHtmlExport) {
    reporterOptions.html = { export: cliOptions.reporterHtmlExport };
  }
  
  if (cliOptions.reporterJunitExport) {
    reporterOptions.junit = { export: cliOptions.reporterJunitExport };
  }
  
  if (cliOptions.reporterCliSilent || cliOptions.reporterCliNoSummary || 
      cliOptions.reporterCliNoFailures || cliOptions.reporterCliNoAssertions || 
      cliOptions.reporterCliNoConsole) {
    reporterOptions.cli = {};
    if (cliOptions.reporterCliSilent) reporterOptions.cli.silent = true;
    if (cliOptions.reporterCliNoSummary) reporterOptions.cli.noSummary = true;
    if (cliOptions.reporterCliNoFailures) reporterOptions.cli.noFailures = true;
    if (cliOptions.reporterCliNoAssertions) reporterOptions.cli.noAssertions = true;
    if (cliOptions.reporterCliNoConsole) reporterOptions.cli.noConsole = true;
  }
  
  if (Object.keys(reporterOptions).length > 0) {
    newmanOptions.reporter = reporterOptions;
  }
  
  // Global and environment variables
  if (cliOptions.globalVar && cliOptions.globalVar.length > 0) {
    newmanOptions.globalVar = parseKeyValuePairs(cliOptions.globalVar);
  }
  
  if (cliOptions.envVar && cliOptions.envVar.length > 0) {
    newmanOptions.envVar = parseKeyValuePairs(cliOptions.envVar);
  }
  
  // Verbose
  if (cliOptions.verbose) newmanOptions.verbose = true;
  
  // Disable unicode
  if (cliOptions.disableUnicode) newmanOptions.disableUnicode = true;
  
  // Insecure file read
  if (cliOptions.noInsecureFileRead === false) {
    newmanOptions.insecureFileRead = false;
  }
  
  return newmanOptions;
}

/**
 * Get all JSON files from the source directory
 */
async function getCollectionFiles(sourcePath) {
  try {
    const stats = await fs.stat(sourcePath);
    
    if (!stats.isDirectory()) {
      throw new Error(`Source path ${sourcePath} is not a directory`);
    }
    
    const files = await fs.readdir(sourcePath);
    const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
    
    return jsonFiles.map(file => path.join(sourcePath, file));
  } catch (error) {
    throw new Error(`Error reading source directory: ${error.message}`);
  }
}

/**
 * Validate if file is a valid Postman collection
 */
async function isValidCollection(filePath) {
  try {
    const content = await fs.readJSON(filePath);
    return content.info && (content.item || content.requests);
  } catch {
    return false;
  }
}

/**
 * Run a single collection with Newman
 */
function runCollection(newmanOptions) {
  return new Promise((resolve, reject) => {
    newman.run(newmanOptions, (err, summary) => {
      if (err) {
        reject(err);
      } else {
        resolve(summary);
      }
    });
  });
}

/**
 * Main function to run all collections
 */
async function runCollections(options) {
  const sourcePath = path.resolve(options.source);
  
  console.log(chalk.cyan(`\n📁 Scanning collections in: ${sourcePath}\n`));
  
  // Get all collection files
  const collectionFiles = await getCollectionFiles(sourcePath);
  
  if (collectionFiles.length === 0) {
    throw new Error('No JSON files found in the source directory');
  }
  
  console.log(chalk.yellow(`Found ${collectionFiles.length} JSON file(s)\n`));
  
  // Filter valid collections
  const validCollections = [];
  for (const file of collectionFiles) {
    if (await isValidCollection(file)) {
      validCollections.push(file);
    } else {
      console.log(chalk.gray(`⊘ Skipping ${path.basename(file)} - not a valid Postman collection`));
    }
  }
  
  if (validCollections.length === 0) {
    throw new Error('No valid Postman collections found');
  }
  
  console.log(chalk.green(`\n✓ Found ${validCollections.length} valid collection(s)\n`));
  console.log(chalk.cyan('━'.repeat(80)));
  
  // Store results
  const results = [];
  
  // Run each collection
  for (let i = 0; i < validCollections.length; i++) {
    const collectionPath = validCollections[i];
    const collectionName = path.basename(collectionPath);
    
    console.log(chalk.cyan(`\n[${i + 1}/${validCollections.length}] Running: ${collectionName}`));
    console.log(chalk.cyan('─'.repeat(80)));
    
    try {
      const newmanOptions = buildNewmanOptions(options, collectionPath);
      const summary = await runCollection(newmanOptions);
      
      // Print summary
      console.log(chalk.green(`\n✓ Collection completed: ${collectionName}`));
      console.log(chalk.gray(`  Total Requests: ${summary.run.stats.requests.total}`));
      console.log(chalk.gray(`  Failed Requests: ${summary.run.stats.requests.failed}`));
      console.log(chalk.gray(`  Total Assertions: ${summary.run.stats.assertions.total}`));
      console.log(chalk.gray(`  Failed Assertions: ${summary.run.stats.assertions.failed}`));
      
      results.push({
        collection: collectionName,
        success: summary.run.stats.assertions.failed === 0,
        stats: summary.run.stats,
        failures: summary.run.failures
      });
      
    } catch (error) {
      console.log(chalk.red(`\n✗ Collection failed: ${collectionName}`));
      console.log(chalk.red(`  Error: ${error.message}`));
      
      results.push({
        collection: collectionName,
        success: false,
        error: error.message
      });
      
      if (options.bail) {
        throw new Error(`Execution stopped due to failure in ${collectionName}`);
      }
    }
    
    console.log(chalk.cyan('━'.repeat(80)));
  }
  
  // Generate report if specified
  if (options.report) {
    await generateReport(results, options.report);
  }
  
  // Final summary
  printFinalSummary(results);
  
  return results;
}

/**
 * Generate consolidated report
 */
async function generateReport(results, reportPath) {
  const report = {
    timestamp: new Date().toISOString(),
    totalCollections: results.length,
    successfulCollections: results.filter(r => r.success).length,
    failedCollections: results.filter(r => !r.success).length,
    results: results
  };
  
  await fs.writeJSON(reportPath, report, { spaces: 2 });
  console.log(chalk.green(`\n📄 Report saved to: ${reportPath}`));
}

/**
 * Print final summary
 */
function printFinalSummary(results) {
  console.log(chalk.cyan('\n' + '═'.repeat(80)));
  console.log(chalk.cyan.bold('FINAL SUMMARY'));
  console.log(chalk.cyan('═'.repeat(80)));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(chalk.white(`\nTotal Collections: ${results.length}`));
  console.log(chalk.green(`Successful: ${successful}`));
  console.log(chalk.red(`Failed: ${failed}`));
  
  if (failed > 0) {
    console.log(chalk.red('\nFailed Collections:'));
    results.filter(r => !r.success).forEach(r => {
      console.log(chalk.red(`  ✗ ${r.collection}`));
      if (r.error) {
        console.log(chalk.gray(`    ${r.error}`));
      }
    });
  }
  
  console.log(chalk.cyan('\n' + '═'.repeat(80) + '\n'));
}

module.exports = {
  runCollections,
  buildNewmanOptions,
  getCollectionFiles,
  isValidCollection,
  runCollection
};
