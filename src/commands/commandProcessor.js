const { Rapid7Service } = require('../services/rapid7Service');
const { EntraIDService } = require('../services/entraIDService');
const { logger } = require('../utils/logger');

class CommandProcessor {
    constructor() {
        this.rapid7Service = new Rapid7Service();
        this.entraIDService = new EntraIDService();
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

            // Execute the unlock command through Rapid7
            const result = await this.rapid7Service.executeCommand(`!unlock-user ${username}`);
            
            return {
                success: true,
                message: `Successfully unlocked user '${username}' (${userInfo.displayName}).`
            };
        } catch (error) {
            logger.error(`Error unlocking user ${username}:`, error);
            return {
                success: false,
                message: `Failed to unlock user '${username}': ${error.message}`
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

            // Execute the enable command through Rapid7
            const result = await this.rapid7Service.executeCommand(`!enable-user ${username}`);
            
            return {
                success: true,
                message: `Successfully enabled user '${username}' (${userInfo.displayName}).`
            };
        } catch (error) {
            logger.error(`Error enabling user ${username}:`, error);
            return {
                success: false,
                message: `Failed to enable user '${username}': ${error.message}`
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

            // Execute the disable command through Rapid7
            const result = await this.rapid7Service.executeCommand(`!disable-user ${username}`);
            
            return {
                success: true,
                message: `Successfully disabled user '${username}' (${userInfo.displayName}).`
            };
        } catch (error) {
            logger.error(`Error disabling user ${username}:`, error);
            return {
                success: false,
                message: `Failed to disable user '${username}': ${error.message}`
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

            // Execute the reset password command through Rapid7
            const result = await this.rapid7Service.executeCommand(`!reset-password ${username}`);
            
            return {
                success: true,
                message: `Successfully reset password for user '${username}' (${userInfo.displayName}). User will be required to change password at next login.`
            };
        } catch (error) {
            logger.error(`Error resetting password for user ${username}:`, error);
            return {
                success: false,
                message: `Failed to reset password for user '${username}': ${error.message}`
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

            // Execute the revoke sessions command through Rapid7
            const result = await this.rapid7Service.executeCommand(`!revoke-sessions ${email}`);
            
            return {
                success: true,
                message: `Successfully revoked all sessions for user '${userInfo.userPrincipalName}' (${userInfo.displayName}).`
            };
        } catch (error) {
            logger.error(`Error revoking sessions for email ${email}:`, error);
            return {
                success: false,
                message: `Failed to revoke sessions for email '${email}': ${error.message}`
            };
        }
    }

    async enableAgent(target, userId, userName, chatId) {
        try {
            // Execute the enable agent command through Rapid7
            const result = await this.rapid7Service.executeCommand(`!enable-agent ${target}`);
            
            return {
                success: true,
                message: `Successfully enabled Sentinel One agent for '${target}' for 3 hours.`
            };
        } catch (error) {
            logger.error(`Error enabling agent for ${target}:`, error);
            return {
                success: false,
                message: `Failed to enable agent for '${target}': ${error.message}`
            };
        }
    }

    async disableAgent(target, userId, userName, chatId) {
        try {
            // Execute the disable agent command through Rapid7
            const result = await this.rapid7Service.executeCommand(`!disable-agent ${target}`);
            
            return {
                success: true,
                message: `Successfully disabled Sentinel One agent for '${target}' for 3 hours.`
            };
        } catch (error) {
            logger.error(`Error disabling agent for ${target}:`, error);
            return {
                success: false,
                message: `Failed to disable agent for '${target}': ${error.message}`
            };
        }
    }
}

module.exports = { CommandProcessor };
