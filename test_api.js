#!/usr/bin/env node
/**
 * Quick test script để verify các API endpoints hoạt động
 * Chạy: node test_api.js
 */

const BASE_URL = 'http://localhost:3000/api';

async function testEndpoint(method, url, body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        console.log(`\n${method} ${url}`);
        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log('Response:', JSON.stringify(data, null, 2));
        
        return { success: response.ok, data, status: response.status };
    } catch (error) {
        console.error(`\n❌ Error testing ${method} ${url}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('🧪 Testing Admin Panel APIs...\n');
    console.log('='.repeat(50));
    
    // Test Dashboard Stats
    await testEndpoint('GET', `${BASE_URL}/dashboard/stats`);
    
    // Test Devices
    await testEndpoint('GET', `${BASE_URL}/devices`);
    
    // Test Heart Rate Data
    await testEndpoint('GET', `${BASE_URL}/heart-rate?page=1&limit=5`);
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Tests completed!');
    console.log('\n💡 Nếu thấy 404, đảm bảo server đang chạy: npm start');
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ This script requires Node.js 18+ with native fetch support');
    console.log('💡 Hoặc cài đặt: npm install node-fetch');
    process.exit(1);
}

runTests().catch(console.error);

