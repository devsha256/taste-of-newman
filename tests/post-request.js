console.log('=== Post-Request Script Executed ===');

// Example: Basic response validation
pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 202, 204]);
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

// Example: Log response details
console.log('Response Status:', pm.response.code);
console.log('Response Time:', pm.response.responseTime + 'ms');
console.log('Response Size:', pm.response.responseSize + ' bytes');

// Example: Save response data
if (pm.response.code === 200) {
    console.log('Request successful');
}
