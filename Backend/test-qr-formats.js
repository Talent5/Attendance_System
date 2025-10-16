const QRService = require('./services/qrService');

console.log('Testing multiple QR code formats...');
console.log('');

// Test 1: Legacy format (the one that was failing)
const legacyQR = '{"employeeId":"EMP005","id":"68b76094e326d38672dd289c","name":"Edward Davis","department":"Engineering","position":"Senior","timestamp":1756890914504,"type":"attendance"}';

console.log('Test 1 - Legacy QR code:');
const result1 = QRService.parseQRCode(legacyQR);
console.log('✓ Valid:', result1.isValid);
console.log('✓ Employee:', result1.employeeName);
console.log('');

// Test 2: Standard format (from admin dashboard)
const standardQR = '{"id":"EMP006","name":"Jane Smith","department":"Marketing","position":"Manager","company":"QR Attendance Company","issued":"2025-09-03T14:00:00.000Z"}';

console.log('Test 2 - Standard QR code:');
const result2 = QRService.parseQRCode(standardQR);
console.log('✓ Valid:', result2.isValid);
console.log('✓ Employee:', result2.employeeName);
console.log('');

// Test 3: Invalid QR code
const invalidQR = '{"invalidFormat":"test"}';

console.log('Test 3 - Invalid QR code:');
const result3 = QRService.parseQRCode(invalidQR);
console.log('✗ Valid:', result3.isValid);
console.log('✗ Error:', result3.error);
console.log('');

console.log('All tests completed!');
