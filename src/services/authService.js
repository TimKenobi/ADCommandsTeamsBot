const { ConfidentialClientApplication } = require('msal-node');
const jwt = require('jsonwebtoken');
const { logger } = require('../utils/logger');

class AuthService {
    constructor() {
        this.msalConfig = {
            auth: {
                clientId: process.env.CLIENT_ID,
                authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
                clientSecret: process.env.CLIENT_SECRET
            }
        };

        this.cca = new ConfidentialClientApplication(this.msalConfig);
        this.activeSessions = new Map();
        this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT) || 3600000; // 1 hour default
    }

    async authenticateUser(userId, chatId) {
        try {
            // Check if user has an active session
            const session = this.activeSessions.get(userId);
            if (session && this.isSessionValid(session)) {
                // Check if user is authorized for this chat
                const isAuthorized = this.checkChatAuthorization(userId, chatId);
                return {
                    authenticated: true,
                    authorized: isAuthorized,
                    session: session
                };
            }

            return {
                authenticated: false,
                authorized: false,
                session: null
            };
        } catch (error) {
            logger.error('Error authenticating user:', error);
            return {
                authenticated: false,
                authorized: false,
                session: null
            };
        }
    }

    async getAuthUrl(userId) {
        try {
            const authUrlParameters = {
                scopes: ['https://graph.microsoft.com/.default'],
                redirectUri: `${process.env.BOT_ENDPOINT}/auth/callback`,
                state: Buffer.from(JSON.stringify({ userId })).toString('base64')
            };

            const response = await this.cca.getAuthCodeUrl(authUrlParameters);
            return response;
        } catch (error) {
            logger.error('Error generating auth URL:', error);
            throw new Error('Failed to generate authentication URL');
        }
    }

    async handleAuthCallback(code, state) {
        try {
            const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
            const userId = decodedState.userId;

            const tokenResponse = await this.cca.acquireTokenByCode({
                code: code,
                scopes: ['https://graph.microsoft.com/.default'],
                redirectUri: `${process.env.BOT_ENDPOINT}/auth/callback`
            });

            if (tokenResponse && tokenResponse.accessToken) {
                // Verify the user's identity and get their details
                const userInfo = await this.getUserInfo(tokenResponse.accessToken);
                
                // Create session
                const session = {
                    userId: userId,
                    accessToken: tokenResponse.accessToken,
                    userInfo: userInfo,
                    timestamp: Date.now(),
                    mfaVerified: true
                };

                this.activeSessions.set(userId, session);
                
                logger.info(`User ${userId} authenticated successfully`);
                return { success: true, session: session };
            }

            throw new Error('Failed to acquire access token');
        } catch (error) {
            logger.error('Error handling auth callback:', error);
            throw new Error('Authentication failed');
        }
    }

    async getUserInfo(accessToken) {
        try {
            const response = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.statusText}`);
            }

            const userInfo = await response.json();
            return {
                id: userInfo.id,
                displayName: userInfo.displayName,
                userPrincipalName: userInfo.userPrincipalName,
                mail: userInfo.mail,
                jobTitle: userInfo.jobTitle,
                department: userInfo.department
            };
        } catch (error) {
            logger.error('Error getting user info:', error);
            throw new Error('Failed to retrieve user information');
        }
    }

    isSessionValid(session) {
        const now = Date.now();
        const sessionAge = now - session.timestamp;
        return sessionAge < this.sessionTimeout;
    }

    checkChatAuthorization(userId, chatId) {
        try {
            // Get user's session to check their role
            const session = this.activeSessions.get(userId);
            if (!session) {
                return false;
            }

            // Check if this is an IT team chat
            if (chatId === process.env.IT_TEAM_CHAT_ID) {
                // IT team has access to all commands
                return true;
            }

            // Check if this is an HR team chat
            if (chatId === process.env.HR_TEAM_CHAT_ID) {
                // HR team has limited access - only disable-user and revoke-sessions
                // This will be enforced in the command processor
                return true;
            }

            // Unknown chat - deny access
            return false;
        } catch (error) {
            logger.error('Error checking chat authorization:', error);
            return false;
        }
    }

    getUserRole(userId) {
        try {
            const session = this.activeSessions.get(userId);
            if (!session) {
                return 'UNAUTHENTICATED';
            }

            // Determine role based on chat access
            // This is a simplified approach - you might want to implement
            // more sophisticated role management based on your organization's needs
            if (session.userInfo.department === 'IT' || session.userInfo.department === 'Information Technology') {
                return 'IT_ADMIN';
            } else if (session.userInfo.department === 'HR' || session.userInfo.department === 'Human Resources') {
                return 'HR_USER';
            }

            return 'STANDARD_USER';
        } catch (error) {
            logger.error('Error getting user role:', error);
            return 'UNKNOWN';
        }
    }

    canExecuteCommand(userId, command, chatId) {
        try {
            const role = this.getUserRole(userId);
            const isITChat = chatId === process.env.IT_TEAM_CHAT_ID;
            const isHRChat = chatId === process.env.HR_TEAM_CHAT_ID;

            // IT admins can execute all commands in IT chat
            if (role === 'IT_ADMIN' && isITChat) {
                return true;
            }

            // HR users can only execute limited commands in HR chat
            if (role === 'HR_USER' && isHRChat) {
                const allowedCommands = ['!disable-user', '!revoke-sessions'];
                return allowedCommands.includes(command);
            }

            return false;
        } catch (error) {
            logger.error('Error checking command permission:', error);
            return false;
        }
    }

    invalidateSession(userId) {
        this.activeSessions.delete(userId);
        logger.info(`Session invalidated for user ${userId}`);
    }

    cleanupExpiredSessions() {
        const now = Date.now();
        for (const [userId, session] of this.activeSessions.entries()) {
            if (!this.isSessionValid(session)) {
                this.activeSessions.delete(userId);
                logger.info(`Expired session cleaned up for user ${userId}`);
            }
        }
    }

    // Start cleanup interval
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 300000); // Clean up every 5 minutes
    }
}

module.exports = { AuthService };
