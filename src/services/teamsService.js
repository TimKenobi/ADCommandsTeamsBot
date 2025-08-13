const { BotFrameworkAdapter } = require('botbuilder');
const { logger } = require('../utils/logger');

class TeamsService {
    constructor() {
        this.adapter = new BotFrameworkAdapter({
            appId: process.env.BOT_ID,
            appPassword: process.env.BOT_PASSWORD
        });
    }

    async sendCommandToChannel(command, department) {
        try {
            logger.info(`Sending command '${command}' to ${department} channel`);

            // Determine which channel to send the command to
            let channelId;
            if (department === 'HR' || department === 'Human Resources') {
                channelId = process.env.HR_TEAM_CHAT_ID;
            } else {
                // Default to IT channel for all other departments and endpoint commands
                channelId = process.env.IT_TEAM_CHAT_ID;
            }

            if (!channelId) {
                throw new Error(`No channel ID configured for ${department} department`);
            }

            // Create a simple message activity
            const message = {
                type: 'message',
                text: command,
                channelId: 'msteams',
                conversation: { id: channelId },
                from: { id: process.env.BOT_ID, name: 'AD Commands Bot' }
            };

            // Send the message to the channel
            await this.adapter.sendActivities(message.conversation.id, [message]);

            logger.info(`Command '${command}' sent successfully to ${department} channel (${channelId})`);
            
            return {
                success: true,
                channelId: channelId,
                department: department,
                message: `Command sent to ${department} channel`
            };

        } catch (error) {
            logger.error(`Error sending command '${command}' to ${department} channel:`, error);
            throw new Error(`Failed to send command to Teams channel: ${error.message}`);
        }
    }

    async sendCommandToSpecificChannel(command, channelId) {
        try {
            logger.info(`Sending command '${command}' to specific channel: ${channelId}`);

            const message = {
                type: 'message',
                text: command,
                channelId: 'msteams',
                conversation: { id: channelId },
                from: { id: process.env.BOT_ID, name: 'AD Commands Bot' }
            };

            await this.adapter.sendActivities(message.conversation.id, [message]);

            logger.info(`Command '${command}' sent successfully to channel: ${channelId}`);
            
            return {
                success: true,
                channelId: channelId,
                message: `Command sent to specified channel`
            };

        } catch (error) {
            logger.error(`Error sending command '${command}' to channel ${channelId}:`, error);
            throw new Error(`Failed to send command to specified channel: ${error.message}`);
        }
    }

    async getChannelInfo(channelId) {
        try {
            // This would typically use Microsoft Graph API to get channel information
            // For now, we'll return basic info
            return {
                id: channelId,
                name: channelId === process.env.IT_TEAM_CHAT_ID ? 'IT Team Channel' : 'HR Team Channel',
                type: 'standard'
            };
        } catch (error) {
            logger.error(`Error getting channel info for ${channelId}:`, error);
            return null;
        }
    }

    async validateChannelAccess(channelId, userId) {
        try {
            // Check if the user has access to the specified channel
            // This would typically involve checking Microsoft Graph API permissions
            const itChannelId = process.env.IT_TEAM_CHAT_ID;
            const hrChannelId = process.env.HR_TEAM_CHAT_ID;

            if (channelId === itChannelId) {
                // IT channel - check if user has IT permissions
                return true; // Simplified for now
            } else if (channelId === hrChannelId) {
                // HR channel - check if user has HR permissions
                return true; // Simplified for now
            }

            return false;
        } catch (error) {
            logger.error(`Error validating channel access for user ${userId} to channel ${channelId}:`, error);
            return false;
        }
    }
}

module.exports = { TeamsService };
