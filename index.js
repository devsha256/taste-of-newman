const newman = require('newman');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Load external test scripts
 */
function loadTestScripts() {
  const testsDir = path.join(__dirname, 'tests');
  let preRequestScript = '';
  let postRequestScript = '';
  
  try {
    const preRequestPath = path.join(testsDir, 'pre-request.js');
    const postRequestPath = path.join(testsDir, 'post-request.js');
    
    if (fs.existsSync(preRequestPath)) {
      preRequestScript = fs.readFileSync(preRequestPath, 'utf8');
      console.log(chalk.green('✓ Loaded pre-request.js'));
    } else {
      console.log(chalk.yellow('⚠ pre-request.js not found, skipping'));
    }
    
    if (fs.existsSync(postRequestPath)) {
      postRequestScript = fs.readFileSync(postRequestPath, 'utf8');
      console.log(chalk.green('✓ Loaded post-request.js'));
    } else {
      console.log(chalk.yellow('⚠ post-request.js not found, skipping'));
    }
  } catch (error) {
    console.log(chalk.yellow('⚠ Could not load test scripts:', error.message));
  }
  
  return {
    preRequest: preRequestScript,
    postRequest: postRequestScript
  };
}

/**
 * Simple wildcard pattern matching
 * Supports * (matches any characters) and ? (matches single character)
 */
function wildcardMatch(text, pattern) {
  if (!pattern) return true;
  if (!text) return false;
  
  // Convert to lowercase for case-insensitive matching
  text = text.toLowerCase();
  pattern = pattern.toLowerCase();
  
  // If no wildcards, just check if pattern is contained in text
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return text.includes(pattern);
  }
  
  // Convert wildcard pattern to regex
  // Escape special regex characters except * and ?
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape special chars
    .replace(/\*/g, '.*')                   // * matches any characters
    .replace(/\?/g, '.');                   // ? matches single character
  
  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(text);
}

/**
 * Get URL from request object - Simplified to use raw URL
 */
function getRequestUrl(request) {
  if (!request) return '';
  
  // Simple case: URL is a string
  if (typeof request.url === 'string') {
    return request.url;
  }
  
  // URL is an object - use raw property
  if (request.url && typeof request.url === 'object' && request.url.raw) {
    return request.url.raw;
  }
  
  return '';
}

/**
 * Filter collection items based on URL pattern
 */
function filterCollectionByPattern(items, pattern, stats) {
  const filteredItems = [];
  
  items.forEach(item => {
    // If item is a folder, recurse into it
    if (item.item && Array.isArray(item.item)) {
      const filteredSubItems = filterCollectionByPattern(item.item, pattern, stats);
      if (filteredSubItems.length > 0) {
        filteredItems.push({
          ...item,
          item: filteredSubItems
        });
      }
    }
    // If item is a request, check if it matches pattern
    else if (item.request) {
      stats.total++;
      const url = getRequestUrl(item.request);
      const requestName = item.name || 'Unnamed Request';
      
      if (wildcardMatch(url, pattern)) {
        filteredItems.push(item);
        stats.matched++;
        stats.matchedUrls.push({
          name: requestName,
          url: url
        });
      } else {
        stats.skipped++;
        stats.skippedUrls.push({
          name: requestName,
          url: url
        });
      }
    }
  });
  
  return filteredItems;
}

/**
 * Apply request pattern filter to collection
 */
function applyRequestFilter(collection, pattern) {
  const stats = {
    total: 0,
    matched: 0,
    skipped: 0,
    matchedUrls: [],
    skippedUrls: []
  };
  
  if (!pattern) {
    return { collection, stats: null };
  }
  
  const filteredCollection = { ...collection };
  
  if (collection.item && Array.isArray(collection.item)) {
    filteredCollection.item = filterCollectionByPattern(collection.item, pattern, stats);
  }
  
  return { collection: filteredCollection, stats };
}

/**
 * Inject scripts into collection
 */
async function injectScriptsIntoCollection(collectionPath, scripts) {
  try {
    const collection = await fs.readJSON(collectionPath);
    
    if (collection.item && Array.isArray(collection.item)) {
      injectScriptsRecursive(collection.item, scripts);
    }
    
    return collection;
  } catch (error) {
    throw new Error(`Failed to inject scripts into collection: ${error.message}`);
  }
}

/**
 * Recursively inject scripts into all items
 */
function injectScriptsRecursive(items, scripts) {
  items.forEach(item => {
    if (item.item && Array.isArray(item.item)) {
      injectScriptsRecursive(item.item, scripts);
    }
    
    if (item.request) {
      if (scripts.preRequest) {
        if (!item.event) {
          item.event = [];
        }
        item.event = item.event.filter(e => e.listen !== 'prerequest');
        item.event.push({
          listen: 'prerequest',
          script: {
            type: 'text/javascript',
            exec: scripts.preRequest.split('\n')
          }
        });
      }
      
      if (scripts.postRequest) {
        if (!item.event) {
          item.event = [];
        }
        item.event = item.event.filter(e => e.listen !== 'test');
        item.event.push({
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: scripts.postRequest.split('\n')
          }
        });
      }
    }
  });
}

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
function buildNewmanOptions(cliOptions, collectionOrPath) {
  const newmanOptions = {
    collection: collectionOrPath,
    reporters: cliOptions.reporters ? cliOptions.reporters.split(',') : ['cli']
  };

  if (cliOptions.environment) newmanOptions.environment = cliOptions.environment;
  if (cliOptions.globals) newmanOptions.globals = cliOptions.globals;
  if (cliOptions.iterationData) newmanOptions.iterationData = cliOptions.iterationData;
  if (cliOptions.iterationCount) newmanOptions.iterationCount = cliOptions.iterationCount;
  if (cliOptions.folder) newmanOptions.folder = cliOptions.folder;
  if (cliOptions.workingDir) newmanOptions.workingDir = cliOptions.workingDir;
  
  if (cliOptions.timeout || cliOptions.timeoutRequest || cliOptions.timeoutScript) {
    newmanOptions.timeout = {};
    if (cliOptions.timeout) newmanOptions.timeout.global = cliOptions.timeout;
    if (cliOptions.timeoutRequest) newmanOptions.timeout.request = cliOptions.timeoutRequest;
    if (cliOptions.timeoutScript) newmanOptions.timeout.script = cliOptions.timeoutScript;
  }
  
  if (cliOptions.delayRequest) newmanOptions.delayRequest = cliOptions.delayRequest;
  if (cliOptions.bail) newmanOptions.bail = true;
  if (cliOptions.suppressExitCode) newmanOptions.suppressExitCode = true;
  if (cliOptions.color) newmanOptions.color = cliOptions.color;
  if (cliOptions.insecure) newmanOptions.insecure = true;
  if (cliOptions.ignoreRedirects) newmanOptions.ignoreRedirects = true;
  
  if (cliOptions.sslClientCert || cliOptions.sslClientKey) {
    newmanOptions.sslClientCert = cliOptions.sslClientCert;
    newmanOptions.sslClientKey = cliOptions.sslClientKey;
    if (cliOptions.sslClientPassphrase) {
      newmanOptions.sslClientPassphrase = cliOptions.sslClientPassphrase;
    }
  }
  
  if (cliOptions.sslExtraCaCerts) newmanOptions.sslExtraCaCerts = cliOptions.sslExtraCaCerts;
  if (cliOptions.cookieJar) newmanOptions.cookieJar = cliOptions.cookieJar;
  if (cliOptions.exportCookieJar) newmanOptions.exportCookieJar = cliOptions.exportCookieJar;
  if (cliOptions.exportEnvironment) newmanOptions.exportEnvironment = cliOptions.exportEnvironment;
  if (cliOptions.exportGlobals) newmanOptions.exportGlobals = cliOptions.exportGlobals;
  if (cliOptions.exportCollection) newmanOptions.exportCollection = cliOptions.exportCollection;
  
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
  
  if (cliOptions.globalVar && cliOptions.globalVar.length > 0) {
    newmanOptions.globalVar = parseKeyValuePairs(cliOptions.globalVar);
  }
  if (cliOptions.envVar && cliOptions.envVar.length > 0) {
    newmanOptions.envVar = parseKeyValuePairs(cliOptions.envVar);
  }
  
  if (cliOptions.verbose) newmanOptions.verbose = true;
  if (cliOptions.disableUnicode) newmanOptions.disableUnicode = true;
  if (cliOptions.noInsecureFileRead === false) newmanOptions.insecureFileRead = false;
  
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
  
  if (options.request) {
    console.log(chalk.cyan(`🔍 Request URL filter: ${options.request}\n`));
  }
  
  console.log(chalk.cyan('📝 Loading test scripts...\n'));
  const scripts = loadTestScripts();
  console.log('');
  
  const collectionFiles = await getCollectionFiles(sourcePath);
  
  if (collectionFiles.length === 0) {
    throw new Error('No JSON files found in the source directory');
  }
  
  console.log(chalk.yellow(`Found ${collectionFiles.length} JSON file(s)\n`));
  
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
  
  const results = [];
  
  for (let i = 0; i < validCollections.length; i++) {
    const collectionPath = validCollections[i];
    const collectionName = path.basename(collectionPath);
    
    console.log(chalk.cyan(`\n[${i + 1}/${validCollections.length}] Running: ${collectionName}`));
    console.log(chalk.cyan('─'.repeat(80)));
    
    try {
      console.log(chalk.gray('Injecting test scripts...'));
      let modifiedCollection = await injectScriptsIntoCollection(collectionPath, scripts);
      
      let filterStats = null;
      if (options.request) {
        console.log(chalk.gray(`Filtering requests by pattern: ${options.request}`));
        const filtered = applyRequestFilter(modifiedCollection, options.request);
        modifiedCollection = filtered.collection;
        filterStats = filtered.stats;
        
        if (filterStats) {
          console.log(chalk.gray(`  Total requests: ${filterStats.total}`));
          console.log(chalk.gray(`  Matched: ${filterStats.matched}`));
          console.log(chalk.gray(`  Skipped: ${filterStats.skipped}`));
          
          if (filterStats.matched === 0) {
            console.log(chalk.red(`\n✗ ERROR: No requests matched the pattern "${options.request}"`));
            console.log(chalk.red(`  Collection: ${collectionName}`));
            
            if (options.verbose && filterStats.skippedUrls.length > 0) {
              console.log(chalk.yellow('\n  Available URLs in collection:'));
              filterStats.skippedUrls.forEach(item => {
                console.log(chalk.yellow(`    - [${item.name}] ${item.url}`));
              });
            }
            
            results.push({
              collection: collectionName,
              success: false,
              error: `No requests matched the pattern "${options.request}"`,
              filterStats
            });
            
            if (options.bail) {
              throw new Error(`No requests matched pattern in ${collectionName}`);
            }
            
            console.log(chalk.cyan('━'.repeat(80)));
            continue;
          }
          
          if (options.verbose && filterStats.matchedUrls.length > 0) {
            console.log(chalk.gray('\n  Matched URLs:'));
            filterStats.matchedUrls.forEach(item => {
              console.log(chalk.gray(`    - [${item.name}] ${item.url}`));
            });
          }
        }
      }
      
      const newmanOptions = buildNewmanOptions(options, modifiedCollection);
      const summary = await runCollection(newmanOptions);
      
      console.log(chalk.green(`\n✓ Collection completed: ${collectionName}`));
      console.log(chalk.gray(`  Total Requests: ${summary.run.stats.requests.total}`));
      console.log(chalk.gray(`  Failed Requests: ${summary.run.stats.requests.failed}`));
      console.log(chalk.gray(`  Total Assertions: ${summary.run.stats.assertions.total}`));
      console.log(chalk.gray(`  Failed Assertions: ${summary.run.stats.assertions.failed}`));
      
      results.push({
        collection: collectionName,
        success: summary.run.stats.assertions.failed === 0,
        stats: summary.run.stats,
        failures: summary.run.failures,
        filterStats
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
  
  if (options.report) {
    await generateReport(results, options.report);
  }
  
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
  runCollection,
  loadTestScripts,
  injectScriptsIntoCollection,
  applyRequestFilter,
  wildcardMatch,
  getRequestUrl
};
