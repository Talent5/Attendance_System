const QRService = require('./services/qrService');

console.log('Testing multiple QR code formats...');
console.log('');

// Test 1: Legacy format (the one that was failing)
const legacyQR = '{"studentId":"STU005","id":"68b76094e326d38672dd289c","name":"Edward Davis","class":"GRADE 11","section":"A","timestamp":1756890914504,"type":"attendance"}';

console.log('Test 1 - Legacy QR code:');
const result1 = QRService.parseQRCode(legacyQR);
console.log('✓ Valid:', result1.isValid);
console.log('✓ Student:', result1.studentName);
console.log('');

// Test 2: Standard format (from admin dashboard)
const standardQR = '{"id":"STU006","name":"Jane Smith","class":"GRADE 10","section":"B","school":"QR Attendance School","issued":"2025-09-03T14:00:00.000Z"}';

console.log('Test 2 - Standard QR code:');
const result2 = QRService.parseQRCode(standardQR);
console.log('✓ Valid:', result2.isValid);
console.log('✓ Student:', result2.studentName);
console.log('');

// Test 3: Invalid QR code
const invalidQR = '{"invalidFormat":"test"}';

console.log('Test 3 - Invalid QR code:');
const result3 = QRService.parseQRCode(invalidQR);
console.log('✗ Valid:', result3.isValid);
console.log('✗ Error:', result3.error);
console.log('');

console.log('All tests completed!');
