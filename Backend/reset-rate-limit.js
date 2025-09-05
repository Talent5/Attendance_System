/**
 * Script to reset rate limiting for development purposes
 * This can be useful when you're testing and hit the rate limit
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

console.log('Rate Limit Reset Utility');
console.log('=======================');

// If you're using an in-memory store (default), restarting the server will reset it
console.log('For development, you can:');
console.log('1. Restart the backend server to reset in-memory rate limits');
console.log('2. Wait 15 minutes for the rate limit to expire');
console.log('3. Use a different IP address (VPN, mobile hotspot, etc.)');
console.log('4. Modify the rate limit settings in middleware/auth.js');

// Display current rate limit settings
console.log('\nCurrent Rate Limit Settings:');
console.log('- Window: 15 minutes');
console.log('- Max attempts (production): 5');
console.log('- Max attempts (development): 20');
console.log('- Skip successful requests: true');

console.log('\nTo temporarily disable rate limiting for development:');
console.log('1. Open Backend/middleware/auth.js');
console.log('2. Comment out the authRateLimit middleware in the login route');
console.log('3. Or set max to a very high number like 1000');

// Environment check
if (process.env.NODE_ENV === 'development') {
  console.log('\n✓ You are in development mode - rate limits are more lenient');
} else {
  console.log('\n⚠ You are in production mode - rate limits are strict');
}

console.log('\nIf you need immediate access:');
console.log('- Check the server logs for your IP address');
console.log('- Restart the backend server');
console.log('- Or temporarily modify the rate limit settings');
