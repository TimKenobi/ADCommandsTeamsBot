const { Rapid7Service } = require('../src/services/rapid7Service');
const { EntraIDService } = require('../src/services/entraIDService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testConnections() {
    console.log('🔍 Testing AD Commands Bot Connections...\n');

    // Test Rapid7 Connection
    console.log('1. Testing Rapid7 Insight Connect Connection...');
    try {
        const rapid7Service = new Rapid7Service();
        const rapid7Result = await rapid7Service.testConnection();
        
        if (rapid7Result.success) {
            console.log('✅ Rapid7 Connection: SUCCESS');
            console.log(`   Status: ${rapid7Result.status}`);
            console.log(`   Message: ${rapid7Result.message}\n`);
        } else {
            console.log('❌ Rapid7 Connection: FAILED');
            console.log(`   Error: ${rapid7Result.error}\n`);
        }
    } catch (error) {
        console.log('❌ Rapid7 Connection: ERROR');
        console.log(`   Error: ${error.message}\n`);
    }

    // Test Microsoft Graph Connection
    console.log('2. Testing Microsoft Graph Connection...');
    try {
        const entraIDService = new EntraIDService();
        const graphResult = await entraIDService.testConnection();
        
        if (graphResult.success) {
            console.log('✅ Microsoft Graph Connection: SUCCESS');
            console.log(`   Status: ${graphResult.status}`);
            console.log(`   Message: ${graphResult.message}\n`);
        } else {
            console.log('❌ Microsoft Graph Connection: FAILED');
            console.log(`   Error: ${graphResult.error}\n`);
        }
    } catch (error) {
        console.log('❌ Microsoft Graph Connection: ERROR');
        console.log(`   Error: ${error.message}\n`);
    }

    // Test Environment Variables
    console.log('3. Testing Environment Variables...');
    const requiredVars = [
        'BOT_ID',
        'BOT_PASSWORD',
        'TENANT_ID',
        'CLIENT_ID',
        'CLIENT_SECRET',
        'RAPID7_BASE_URL',
        'RAPID7_API_KEY',
        'IT_TEAM_CHAT_ID',
        'HR_TEAM_CHAT_ID',
        'DOMAIN_1',
        'DOMAIN_2'
    ];

    let envVarsOk = true;
    requiredVars.forEach(varName => {
        if (process.env[varName]) {
            console.log(`   ✅ ${varName}: Set`);
        } else {
            console.log(`   ❌ ${varName}: Missing`);
            envVarsOk = false;
        }
    });

    if (envVarsOk) {
        console.log('\n✅ All required environment variables are set\n');
    } else {
        console.log('\n❌ Some required environment variables are missing\n');
    }

    // Summary
    console.log('📊 Connection Test Summary:');
    console.log('============================');
    console.log('Check the results above to ensure all connections are working properly.');
    console.log('If any tests fail, review your configuration and try again.');
}

// Run the tests
if (require.main === module) {
    testConnections().catch(console.error);
}

module.exports = { testConnections };
