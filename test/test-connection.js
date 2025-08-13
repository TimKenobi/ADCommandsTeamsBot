const { EntraIDService } = require('../src/services/entraIDService');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testConnections() {
    console.log('🔍 Testing AD Commands Bot Connections...\n');

    // Test Microsoft Graph Connection
    console.log('1. Testing Microsoft Graph Connection...');
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

    // Test Teams Bot Configuration
    console.log('2. Testing Teams Bot Configuration...');
    const teamsConfig = {
        BOT_ID: process.env.BOT_ID,
        BOT_PASSWORD: process.env.BOT_PASSWORD,
        TEAMS_APP_ID: process.env.TEAMS_APP_ID,
        TEAMS_APP_PASSWORD: process.env.TEAMS_APP_PASSWORD
    };

    let teamsConfigOk = true;
    Object.entries(teamsConfig).forEach(([key, value]) => {
        if (value) {
            console.log(`   ✅ ${key}: Set`);
        } else {
            console.log(`   ❌ ${key}: Missing`);
            teamsConfigOk = false;
        }
    });

    if (teamsConfigOk) {
        console.log('\n✅ All Teams bot configuration variables are set\n');
    } else {
        console.log('\n❌ Some Teams bot configuration variables are missing\n');
    }

    // Test Environment Variables
    console.log('3. Testing Environment Variables...');
    const requiredVars = [
        'TENANT_ID',
        'CLIENT_ID',
        'CLIENT_SECRET',
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
    console.log('\nNote: This bot works by sending commands to Teams channels where');
    console.log('Insight Connect is already listening and processing commands.');
}

// Run the tests
if (require.main === module) {
    testConnections().catch(console.error);
}

module.exports = { testConnections };
