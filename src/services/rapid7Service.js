const axios = require('axios');
const { logger } = require('../utils/logger');

class Rapid7Service {
    constructor() {
        this.baseUrl = process.env.RAPID7_BASE_URL;
        this.apiKey = process.env.RAPID7_API_KEY;
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'AD-Commands-Teams-Bot/1.0'
            },
            timeout: 30000 // 30 second timeout
        });
    }

    async executeCommand(command) {
        try {
            logger.info(`Executing Rapid7 command: ${command}`);

            // The exact API endpoint and payload structure will depend on your Rapid7 Insight Connect setup
            // This is a template that you'll need to adjust based on your specific configuration
            
            const payload = {
                command: command,
                timestamp: new Date().toISOString(),
                source: 'teams-bot',
                parameters: this.parseCommand(command)
            };

            // Execute the command through Rapid7 Insight Connect
            const response = await this.client.post('/api/v1/commands/execute', payload);

            if (response.status === 200 || response.status === 202) {
                logger.info(`Rapid7 command executed successfully: ${command}`);
                return {
                    success: true,
                    response: response.data,
                    message: 'Command executed successfully'
                };
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }

        } catch (error) {
            logger.error(`Error executing Rapid7 command ${command}:`, error);
            
            if (error.response) {
                // Server responded with error status
                logger.error(`Rapid7 API error: ${error.response.status} - ${error.response.data}`);
                throw new Error(`Rapid7 API error: ${error.response.status} - ${error.response.data}`);
            } else if (error.request) {
                // Request was made but no response received
                logger.error('No response received from Rapid7 API');
                throw new Error('No response received from Rapid7 API');
            } else {
                // Something else happened
                throw new Error(`Command execution failed: ${error.message}`);
            }
        }
    }

    parseCommand(command) {
        const parts = command.split(' ');
        const action = parts[0];
        const target = parts[1];

        switch (action) {
            case '!unlock-user':
                return {
                    action: 'unlock_user',
                    target: target,
                    targetType: 'username',
                    domain: this.determineDomain(target)
                };

            case '!enable-user':
                return {
                    action: 'enable_user',
                    target: target,
                    targetType: 'username',
                    domain: this.determineDomain(target)
                };

            case '!disable-user':
                return {
                    action: 'disable_user',
                    target: target,
                    targetType: 'username',
                    domain: this.determineDomain(target)
                };

            case '!reset-password':
                return {
                    action: 'reset_password',
                    target: target,
                    targetType: 'username',
                    domain: this.determineDomain(target),
                    options: {
                        forceChangeAtNextLogon: true
                    }
                };

            case '!revoke-sessions':
                return {
                    action: 'revoke_sessions',
                    target: target,
                    targetType: 'email',
                    domain: this.determineDomain(target)
                };

            case '!enable-agent':
                return {
                    action: 'enable_agent',
                    target: target,
                    targetType: 'endpoint',
                    duration: '3h',
                    options: {
                        agentType: 'sentinel_one'
                    }
                };

            case '!disable-agent':
                return {
                    action: 'disable_agent',
                    target: target,
                    targetType: 'endpoint',
                    duration: '3h',
                    options: {
                        agentType: 'sentinel_one'
                    }
                };

            default:
                return {
                    action: 'unknown',
                    target: target,
                    targetType: 'unknown'
                };
        }
    }

    determineDomain(target) {
        // This is a simplified domain detection
        // You might want to implement more sophisticated domain logic based on your setup
        
        if (target.includes('@')) {
            // Email address - extract domain
            return target.split('@')[1];
        }

        // For usernames, you might want to check against known domains
        // or implement logic to determine which domain the user belongs to
        
        // Default to primary domain
        return process.env.DOMAIN_1 || 'default.domain.com';
    }

    async testConnection() {
        try {
            const response = await this.client.get('/api/v1/health');
            return {
                success: true,
                status: response.status,
                message: 'Connection to Rapid7 successful'
            };
        } catch (error) {
            logger.error('Rapid7 connection test failed:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to connect to Rapid7'
            };
        }
    }

    async getCommandStatus(commandId) {
        try {
            const response = await this.client.get(`/api/v1/commands/${commandId}/status`);
            return {
                success: true,
                status: response.data.status,
                details: response.data
            };
        } catch (error) {
            logger.error(`Error getting command status for ${commandId}:`, error);
            throw new Error(`Failed to get command status: ${error.message}`);
        }
    }

    async getAvailableCommands() {
        try {
            const response = await this.client.get('/api/v1/commands/available');
            return {
                success: true,
                commands: response.data.commands || []
            };
        } catch (error) {
            logger.error('Error getting available commands:', error);
            return {
                success: false,
                commands: [],
                error: error.message
            };
        }
    }

    // Method to handle different Rapid7 API versions or endpoints
    async executeCommandLegacy(command) {
        try {
            // Alternative method for older Rapid7 versions or different API structure
            const payload = {
                action: command,
                timestamp: new Date().toISOString(),
                source: 'teams-bot'
            };

            const response = await this.client.post('/api/legacy/execute', payload);
            
            return {
                success: true,
                response: response.data,
                message: 'Command executed successfully (legacy method)'
            };

        } catch (error) {
            logger.error(`Error executing legacy Rapid7 command ${command}:`, error);
            throw new Error(`Legacy command execution failed: ${error.message}`);
        }
    }
}

module.exports = { Rapid7Service };
