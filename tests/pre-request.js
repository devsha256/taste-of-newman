// This script will be injected as pre-request script for all requests
// Add your common pre-request logic here

console.log('=== Pre-Request Script Executed ===');

// Example: Set timestamp
pm.globals.set("requestTimestamp", new Date().toISOString());

// Example: Add common headers or authentication logic
// pm.request.headers.add({key: 'X-Request-ID', value: pm.variables.replaceIn('{{$guid}}')});

// Example: Log request details
console.log('Request URL:', pm.request.url.toString());
console.log('Request Method:', pm.request.method);
