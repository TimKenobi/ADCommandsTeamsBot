const { EntraIDService } = require('../services/entraIDService');
const { TeamsService } = require('../services/teamsService');
const { logger } = require('../utils/logger');

class CommandProcessor {
    constructor() {
        this.entraIDService = new EntraIDService();
        this.teamsService = new TeamsService();
    }

    async processCommand(command, userId, userName, chatId) {
        try {
            const parts = command.split(' ');
            const action = parts[0].toLowerCase();
            const target = parts[1];

            if (!target) {
                return {
                    success: false,
                    message: 'Please provide a target (username, email, or IP/hostname) for the command.'
                };
            }

            logger.info(`Processing command: ${action} for target: ${target} by user: ${userName}`);

            switch (action) {
                case '!unlock-user':
                    return await this.unlockUser(target, userId, userName, chatId);
                
                case '!enable-user':
                    return await this.enableUser(target, userId, userName, chatId);
                
                case '!disable-user':
                    return await this.disableUser(target, userId, userName, chatId);
                
                case '!reset-password':
                    return await this.resetPassword(target, userId, userName, chatId);
                
                case '!revoke-sessions':
                    return await this.revokeSessions(target, userId, userName, chatId);
                
                case '!enable-agent':
                    return await this.enableAgent(target, userId, userName, chatId);
                
                case '!disable-agent':
                    return await this.disableAgent(target, userId, userName, chatId);
                
                default:
                    return {
                        success: false,
                        message: `Unknown command: ${action}. Type any message to see available commands.`
                    };
            }
        } catch (error) {
            logger.error('Error processing command:', error);
            return {
                success: false,
                message: 'An error occurred while processing your command. Please try again.'
            };
        }
    }

    async unlockUser(username, userId, userName, chatId) {
        try {
            // First, verify the user exists in Entra ID
            const userInfo = await this.entraIDService.getUserByUsername(username);
            if (!userInfo) {
                return {
                    success: false,
                    message: `User '${username}' not found in Active Directory.`
                };
            }

            // Send the command to the appropriate Teams channel for Insight Connect to process
            const commandMessage = `!unlock-user ${username}`;
            const teamsResult = await this.teamsService.sendCommandToChannel(commandMessage, userInfo.department || 'IT');
            
            return {
                success: true,
                message: `Command '${commandMessage}' sent to Insight Connect channel. User '${username}' (${userInfo.displayName}) will be unlocked.`
            };
        } catch (error) {
            logger.error(`Error unlocking user ${username}:`, error);
            return {
                success: false,
                message: `Failed to process unlock command for user '${username}': ${error.message}`
            };
        }
    }

    async enableUser(username, userId, userName, chatId) {
        try {
            // Verify the user exists in Entra ID
            const userInfo = await this.entraIDService.getUserByUsername(username);
            if (!userInfo) {
                return {
                    success: false,
                    message: `User '${username}' not found in Active Directory.`
                };
            }

            // Send the command to the appropriate Teams channel
            const commandMessage = `!enable-user ${username}`;
            await this.teamsService.sendCommandToChannel(commandMessage, userInfo.department || 'IT');
            
            return {
                success: true,
                message: `Command '${commandMessage}' sent to Insight Connect channel. User '${username}' (${userInfo.displayName}) will be enabled.`
            };
        } catch (error) {
            logger.error(`Error enabling user ${username}:`, error);
            return {
                success: false,
                message: `Failed to process enable command for user '${username}': ${error.message}`
            };
        }
    }

    async disableUser(username, userId, userName, chatId) {
        try {
            // Verify the user exists in Entra ID
            const userInfo = await this.entraIDService.getUserByUsername(username);
            if (!userInfo) {
                return {
                    success: false,
                    message: `User '${username}' not found in Active Directory.`
                };
            }

            // Send the command to the appropriate Teams channel
            const commandMessage = `!disable-user ${username}`;
            await this.teamsService.sendCommandToChannel(commandMessage, userInfo.department || 'IT');
            
            return {
                success: true,
                message: `Command '${commandMessage}' sent to Insight Connect channel. User '${username}' (${userInfo.displayName}) will be disabled.`
            };
        } catch (error) {
            logger.error(`Error disabling user ${username}:`, error);
            return {
                success: false,
                message: `Failed to process disable command for user '${username}': ${error.message}`
            };
        }
    }

    async resetPassword(username, userId, userName, chatId) {
        try {
            // Verify the user exists in Entra ID
            const userInfo = await this.entraIDService.getUserByUsername(username);
            if (!userInfo) {
                return {
                    success: false,
                    message: `User '${username}' not found in Active Directory.`
                };
            }

            // Send the command to the appropriate Teams channel
            const commandMessage = `!reset-password ${username}`;
            await this.teamsService.sendCommandToChannel(commandMessage, userInfo.department || 'IT');
            
            return {
                success: true,
                message: `Command '${commandMessage}' sent to Insight Connect channel. Password for user '${username}' (${userInfo.displayName}) will be reset for next login.`
            };
        } catch (error) {
            logger.error(`Error resetting password for user ${username}:`, error);
            return {
                success: false,
                message: `Failed to process password reset command for user '${username}': ${error.message}`
            };
        }
    }

    async revokeSessions(email, userId, userName, chatId) {
        try {
            // Verify the user exists in Entra ID by email
            const userInfo = await this.entraIDService.getUserByEmail(email);
            if (!userInfo) {
                return {
                    success: false,
                    message: `User with email '${email}' not found in Active Directory.`
                };
            }

            // Send the command to the appropriate Teams channel
            const commandMessage = `!revoke-sessions ${email}`;
            await this.teamsService.sendCommandToChannel(commandMessage, userInfo.department || 'IT');
            
            return {
                success: true,
                message: `Command '${commandMessage}' sent to Insight Connect channel. All sessions for user '${userInfo.userPrincipalName}' (${userInfo.displayName}) will be revoked.`
            };
        } catch (error) {
            logger.error(`Error revoking sessions for email ${email}:`, error);
            return {
                success: false,
                message: `Failed to process revoke sessions command for email '${email}': ${error.message}`
            };
        }
    }

    async enableAgent(target, userId, userName, chatId) {
        try {
            // Send the command to the IT channel for endpoint management
            const commandMessage = `!enable-agent ${target}`;
            await this.teamsService.sendCommandToChannel(commandMessage, 'IT');
            
            return {
                success: true,
                message: `Command '${commandMessage}' sent to Insight Connect channel. Sentinel One agent for '${target}' will be enabled for 3 hours.`
            };
        } catch (error) {
            logger.error(`Error enabling agent for ${target}:`, error);
            return {
                success: false,
                message: `Failed to process enable agent command for '${target}': ${error.message}`
            };
        }
    }

    async disableAgent(target, userId, userName, chatId) {
        try {
            // Send the command to the IT channel for endpoint management
            const commandMessage = `!disable-agent ${target}`;
            await this.teamsService.sendCommandToChannel(commandMessage, 'IT');
            
            return {
                success: true,
                message: `Command '${commandMessage}' sent to Insight Connect channel. Sentinel One agent for '${target}' will be disabled for 3 hours.`
            };
        } catch (error) {
            logger.error(`Error disabling agent for ${target}:`, error);
            return {
                success: false,
                message: `Failed to process disable agent command for '${target}': ${error.message}`
            };
        }
    }
}

module.exports = { CommandProcessor };
