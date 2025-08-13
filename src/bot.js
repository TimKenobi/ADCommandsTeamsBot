const { ActivityTypes, CardFactory, ActionTypes } = require('botbuilder');
const { CommandProcessor } = require('./commands/commandProcessor');
const { AuthService } = require('./services/authService');
const { AuditLogger } = require('./services/auditLogger');
const { logger } = require('./utils/logger');

class ADCommandsBot {
    constructor() {
        this.commandProcessor = new CommandProcessor();
        this.authService = new AuthService();
        this.auditLogger = new AuditLogger();
    }

    async run(context) {
        if (context.activity.type === ActivityTypes.Message) {
            await this.onMessage(context);
        } else if (context.activity.type === ActivityTypes.ConversationUpdate) {
            await this.onConversationUpdate(context);
        }
    }

    async onMessage(context) {
        try {
            const text = context.activity.text.trim();
            const userId = context.activity.from.aadObjectId || context.activity.from.id;
            const userName = context.activity.from.name;
            const chatId = context.activity.conversation.id;

            logger.info(`Message received from ${userName} (${userId}) in chat ${chatId}: ${text}`);

            // Check if this is a command
            if (text.startsWith('!')) {
                await this.handleCommand(context, text, userId, userName, chatId);
            } else {
                await this.sendHelpMessage(context);
            }
        } catch (error) {
            logger.error('Error processing message:', error);
            await context.sendActivity('Sorry, I encountered an error processing your request. Please try again.');
        }
    }

    async onConversationUpdate(context) {
        if (context.activity.membersAdded && context.activity.membersAdded.length > 0) {
            for (const member of context.activity.membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await this.sendWelcomeMessage(context);
                }
            }
        }
    }

    async handleCommand(context, command, userId, userName, chatId) {
        try {
            // Check if user is authenticated and has access to this chat
            const authResult = await this.authService.authenticateUser(userId, chatId);
            
            if (!authResult.authenticated) {
                await context.sendActivity('Authentication required. Please authenticate with MFA to continue.');
                await this.sendAuthCard(context, userId);
                return;
            }

            if (!authResult.authorized) {
                await context.sendActivity('You are not authorized to use commands in this chat.');
                return;
            }

            // Process the command
            const result = await this.commandProcessor.processCommand(command, userId, userName, chatId);
            
            // Log the command execution
            await this.auditLogger.logCommand({
                userId,
                userName,
                chatId,
                command,
                result: result.success ? 'SUCCESS' : 'FAILED',
                details: result.message,
                timestamp: new Date().toISOString()
            });

            // Send response
            if (result.success) {
                await context.sendActivity(`✅ ${result.message}`);
            } else {
                await context.sendActivity(`❌ ${result.message}`);
            }

        } catch (error) {
            logger.error('Error handling command:', error);
            await context.sendActivity('Sorry, I encountered an error processing your command. Please try again.');
        }
    }

    async sendAuthCard(context, userId) {
        const authUrl = await this.authService.getAuthUrl(userId);
        
        const card = CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            version: '1.0',
            body: [
                {
                    type: 'TextBlock',
                    text: 'Authentication Required',
                    size: 'Large',
                    weight: 'Bolder'
                },
                {
                    type: 'TextBlock',
                    text: 'Please click the button below to authenticate with MFA.',
                    wrap: true
                }
            ],
            actions: [
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Authenticate',
                    url: authUrl
                }
            ]
        });

        await context.sendActivity({ attachments: [card] });
    }

    async sendWelcomeMessage(context) {
        const welcomeCard = CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            version: '1.0',
            body: [
                {
                    type: 'TextBlock',
                    text: 'Welcome to AD Commands Bot! 🎉',
                    size: 'Large',
                    weight: 'Bolder'
                },
                {
                    type: 'TextBlock',
                    text: 'I can help you manage Active Directory users and endpoints through Teams channels.',
                    wrap: true
                },
                {
                    type: 'TextBlock',
                    text: 'Available commands:',
                    weight: 'Bolder',
                    spacing: 'Medium'
                },
                {
                    type: 'FactSet',
                    facts: [
                        {
                            title: 'User Management:',
                            value: '!unlock-user, !enable-user, !disable-user, !reset-password, !revoke-sessions'
                        },
                        {
                            title: 'Endpoint Control:',
                            value: '!enable-agent, !disable-agent'
                        },
                        {
                            title: 'Help:',
                            value: 'Type any message to see this help'
                        }
                    ]
                }
            ]
        });

        await context.sendActivity({ attachments: [welcomeCard] });
    }

    async sendHelpMessage(context) {
        const helpCard = CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            version: '1.0',
            body: [
                {
                    type: 'TextBlock',
                    text: 'AD Commands Bot Help',
                    size: 'Large',
                    weight: 'Bolder'
                },
                {
                    type: 'TextBlock',
                    text: 'Here are the available commands:',
                    spacing: 'Medium'
                },
                {
                    type: 'FactSet',
                    facts: [
                        {
                            title: 'User Management:',
                            value: '!unlock-user <username> - Unlock a user account\n!enable-user <username> - Enable a user account\n!disable-user <username> - Disable a user account\n!reset-password <username> - Reset password for next login\n!revoke-sessions <email> - Revoke all user sessions'
                        },
                        {
                            title: 'Endpoint Control:',
                            value: '!enable-agent <ip/hostname> - Enable Sentinel One agent for 3 hours\n!disable-agent <ip/hostname> - Disable Sentinel One agent for 3 hours'
                        },
                        {
                            title: 'Note:',
                            value: 'All commands require MFA authentication. HR team has limited access to disable-user and revoke-sessions only.'
                        }
                    ]
                }
            ]
        });

        await context.sendActivity({ attachments: [helpCard] });
    }
}

module.exports = { ADCommandsBot };
