#!/usr/bin/env node
// CS720 Setup Verification Script
// Run with: node test-setup.js

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('\n🔍 CS720 Setup Verification\n');

// Check project structure
const requiredFiles = [
    'package.json',
    'frontend/package.json',
    'backend/package.json',
    'backend/.env',
    'README.md',
    'SETUP.md'
];

console.log('📁 Checking project structure...');
let allFilesExist = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

// Check environment configuration
console.log('\n🔧 Checking environment configuration...');
try {
    const envPath = path.join(__dirname, 'backend', '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');

    const requiredEnvVars = [
        'SALESFORCE_CLIENT_ID',
        'SALESFORCE_CLIENT_SECRET',
        'MICROSOFT_CLIENT_ID',
        'MICROSOFT_CLIENT_SECRET',
        'ENCRYPTION_KEY'
    ];

    let envConfigured = true;
    requiredEnvVars.forEach(envVar => {
        if (envContent.includes(`${envVar}=your_`) || !envContent.includes(envVar)) {
            console.log(`⚠️  ${envVar} - Not configured`);
            envConfigured = false;
        } else {
            console.log(`✅ ${envVar} - Configured`);
        }
    });

    if (!envConfigured) {
        console.log('\n⚠️  Some environment variables need configuration.');
        console.log('See SETUP.md for OAuth setup instructions.');
    }

} catch (error) {
    console.log('❌ Error reading .env file:', error.message);
}

// Check if servers can start (quick test)
console.log('\n🚀 Testing server startup (quick check)...');

function testUrl(url, name) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            console.log(`✅ ${name} - Responding (${res.statusCode})`);
            resolve(true);
        });

        req.on('error', (err) => {
            console.log(`❌ ${name} - Not responding (${err.code})`);
            resolve(false);
        });

        req.setTimeout(2000, () => {
            req.destroy();
            console.log(`⚠️  ${name} - Timeout (not running)`);
            resolve(false);
        });
    });
}

// Test if servers are already running
Promise.all([
    testUrl('http://localhost:3001/health', 'Backend API'),
    testUrl('http://localhost:3000', 'Frontend App')
]).then(([backendRunning, frontendRunning]) => {

    console.log('\n📊 Setup Summary:');
    console.log(`Files: ${allFilesExist ? '✅' : '❌'}`);
    console.log(`Backend: ${backendRunning ? '✅ Running' : '⚠️  Not running'}`);
    console.log(`Frontend: ${frontendRunning ? '✅ Running' : '⚠️  Not running'}`);

    if (!backendRunning && !frontendRunning) {
        console.log('\n💡 To start the servers, run: npm run dev');
    }

    console.log('\n🎯 Next steps:');
    console.log('1. Configure OAuth credentials in backend/.env');
    console.log('2. Run: npm run dev');
    console.log('3. Open: http://localhost:3000');
    console.log('4. See SETUP.md for detailed instructions');

    console.log('\n✨ CS720 setup verification complete!\n');
});