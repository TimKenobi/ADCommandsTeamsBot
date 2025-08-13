const { ConfidentialClientApplication } = require('msal-node');
const { logger } = require('../utils/logger');

class EntraIDService {
    constructor() {
        this.msalConfig = {
            auth: {
                clientId: process.env.CLIENT_ID,
                authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
                clientSecret: process.env.CLIENT_SECRET
            }
        };

        this.cca = new ConfidentialClientApplication(this.msalConfig);
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        try {
            // Check if we have a valid token
            if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
                return this.accessToken;
            }

            // Get new token
            const tokenResponse = await this.cca.acquireTokenByClientCredential({
                scopes: ['https://graph.microsoft.com/.default']
            });

            if (tokenResponse && tokenResponse.accessToken) {
                this.accessToken = tokenResponse.accessToken;
                // Set expiry to 50 minutes from now (tokens typically last 1 hour)
                this.tokenExpiry = Date.now() + (50 * 60 * 1000);
                return this.accessToken;
            }

            throw new Error('Failed to acquire access token');
        } catch (error) {
            logger.error('Error getting access token:', error);
            throw new Error('Failed to authenticate with Microsoft Graph');
        }
    }

    async getUserByUsername(username) {
        try {
            const accessToken = await this.getAccessToken();
            
            // Search for user by username (userPrincipalName or sAMAccountName)
            const query = encodeURIComponent(`userPrincipalName eq "${username}@${process.env.DOMAIN_1}" or userPrincipalName eq "${username}@${process.env.DOMAIN_2}" or sAMAccountName eq "${username}"`);
            
            const response = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=${query}&$select=id,displayName,userPrincipalName,mail,sAMAccountName,accountEnabled,department,jobTitle,lastPasswordChangeDateTime`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Graph API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.value && data.value.length > 0) {
                const user = data.value[0];
                logger.info(`Found user: ${user.displayName} (${user.userPrincipalName})`);
                return {
                    id: user.id,
                    displayName: user.displayName,
                    userPrincipalName: user.userPrincipalName,
                    mail: user.mail,
                    sAMAccountName: user.sAMAccountName,
                    accountEnabled: user.accountEnabled,
                    department: user.department,
                    jobTitle: user.jobTitle,
                    lastPasswordChangeDateTime: user.lastPasswordChangeDateTime
                };
            }

            logger.info(`User not found: ${username}`);
            return null;

        } catch (error) {
            logger.error(`Error looking up user by username ${username}:`, error);
            throw new Error(`Failed to look up user: ${error.message}`);
        }
    }

    async getUserByEmail(email) {
        try {
            const accessToken = await this.getAccessToken();
            
            // Search for user by email
            const query = encodeURIComponent(`mail eq "${email}" or userPrincipalName eq "${email}"`);
            
            const response = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=${query}&$select=id,displayName,userPrincipalName,mail,sAMAccountName,accountEnabled,department,jobTitle,lastPasswordChangeDateTime`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Graph API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.value && data.value.length > 0) {
                const user = data.value[0];
                logger.info(`Found user by email: ${user.displayName} (${user.userPrincipalName})`);
                return {
                    id: user.id,
                    displayName: user.displayName,
                    userPrincipalName: user.userPrincipalName,
                    mail: user.mail,
                    sAMAccountName: user.sAMAccountName,
                    accountEnabled: user.accountEnabled,
                    department: user.department,
                    jobTitle: user.jobTitle,
                    lastPasswordChangeDateTime: user.lastPasswordChangeDateTime
                };
            }

            logger.info(`User not found by email: ${email}`);
            return null;

        } catch (error) {
            logger.error(`Error looking up user by email ${email}:`, error);
            throw new Error(`Failed to look up user: ${error.message}`);
        }
    }

    async getUserByDisplayName(displayName) {
        try {
            const accessToken = await this.getAccessToken();
            
            // Search for user by display name (partial match)
            const query = encodeURIComponent(`startswith(displayName, "${displayName}")`);
            
            const response = await fetch(`https://graph.microsoft.com/v1.0/users?$filter=${query}&$select=id,displayName,userPrincipalName,mail,sAMAccountName,accountEnabled,department,jobTitle,lastPasswordChangeDateTime&$top=10`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Graph API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.value && data.value.length > 0) {
                logger.info(`Found ${data.value.length} users matching display name: ${displayName}`);
                return data.value.map(user => ({
                    id: user.id,
                    displayName: user.displayName,
                    userPrincipalName: user.userPrincipalName,
                    mail: user.mail,
                    sAMAccountName: user.sAMAccountName,
                    accountEnabled: user.accountEnabled,
                    department: user.department,
                    jobTitle: user.jobTitle,
                    lastPasswordChangeDateTime: user.lastPasswordChangeDateTime
                }));
            }

            logger.info(`No users found matching display name: ${displayName}`);
            return [];

        } catch (error) {
            logger.error(`Error looking up user by display name ${displayName}:`, error);
            throw new Error(`Failed to look up user: ${error.message}`);
        }
    }

    async getUserGroups(userId) {
        try {
            const accessToken = await this.getAccessToken();
            
            const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/memberOf?$select=id,displayName,groupTypes,mailEnabled,securityEnabled`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Graph API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.value) {
                return data.value.map(group => ({
                    id: group.id,
                    displayName: group.displayName,
                    groupTypes: group.groupTypes,
                    mailEnabled: group.mailEnabled,
                    securityEnabled: group.securityEnabled
                }));
            }

            return [];

        } catch (error) {
            logger.error(`Error getting groups for user ${userId}:`, error);
            throw new Error(`Failed to get user groups: ${error.message}`);
        }
    }

    async checkUserPermissions(userId) {
        try {
            const groups = await this.getUserGroups(userId);
            
            // Check if user is in IT or HR groups
            const isITUser = groups.some(group => 
                group.displayName.toLowerCase().includes('it') || 
                group.displayName.toLowerCase().includes('information technology') ||
                group.displayName.toLowerCase().includes('administrators')
            );
            
            const isHRUser = groups.some(group => 
                group.displayName.toLowerCase().includes('hr') || 
                group.displayName.toLowerCase().includes('human resources')
            );

            return {
                isITUser,
                isHRUser,
                groups: groups.map(g => g.displayName)
            };

        } catch (error) {
            logger.error(`Error checking permissions for user ${userId}:`, error);
            return {
                isITUser: false,
                isHRUser: false,
                groups: []
            };
        }
    }

    async testConnection() {
        try {
            const accessToken = await this.getAccessToken();
            
            const response = await fetch('https://graph.microsoft.com/v1.0/users?$top=1&$select=id', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                success: response.ok,
                status: response.status,
                message: response.ok ? 'Connection to Microsoft Graph successful' : 'Connection failed'
            };

        } catch (error) {
            logger.error('Microsoft Graph connection test failed:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to connect to Microsoft Graph'
            };
        }
    }
}

module.exports = { EntraIDService };
