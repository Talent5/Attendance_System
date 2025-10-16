const QRService = require('./services/qrService');

// Test the QR code that was failing
const testQRCode = '{"employeeId":"EMP005","id":"68b76094e326d38672dd289c","name":"Edward Davis","department":"Engineering","position":"Senior","timestamp":1756890914504,"type":"attendance"}';

console.log('Testing QR code parsing...');
console.log('QR Code:', testQRCode);
console.log('');

// Test the parsing
const result = QRService.parseQRCode(testQRCode);

console.log('Parse Result:');
console.log('- isValid:', result.isValid);
console.log('- employeeId:', result.employeeId);
console.log('- employeeName:', result.employeeName);
console.log('- department:', result.department);
console.log('- section:', result.section);

if (result.error) {
  console.log('- error:', result.error);
}

console.log('');

// Test integrity verification directly
try {
  const qrData = JSON.parse(testQRCode);
  const isIntegrityValid = QRService.verifyQRCodeIntegrity(qrData);
  console.log('Direct integrity check:', isIntegrityValid);
} catch (error) {
  console.log('Direct integrity check failed:', error.message);
}

console.log('');
console.log('Test completed!');
