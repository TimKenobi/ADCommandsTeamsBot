# AD Commands Teams Bot

A Microsoft Teams Bot application that provides secure access to Active Directory management commands through Rapid7 Insight Connect integration.

## Features

- **User Management Commands**: Unlock, enable, disable users, reset passwords, and revoke sessions
- **Endpoint Agent Control**: Enable/disable Sentinel One agents for 3 hours
- **Role-Based Access Control**: Different permissions for IT team vs HR team
- **MFA Authentication**: Required for every command execution
- **Audit Logging**: Complete record of all commands and users
- **Multi-Domain Support**: Handles commands across different Active Directory domains

## Commands

### IT Team Commands (Full Access)
- `!unlock-user <username>` - Unlock a user account
- `!enable-user <username>` - Enable a user account
- `!disable-user <username>` - Disable a user account
- `!reset-password <username>` - Reset user password for next login
- `!revoke-sessions <email>` - Revoke all user sessions
- `!enable-agent <ip/hostname>` - Enable Sentinel One agent for 3 hours
- `!disable-agent <ip/hostname>` - Disable Sentinel One agent for 3 hours

### HR Team Commands (Limited Access)
- `!disable-user <username>` - Disable a user account
- `!revoke-sessions <email>` - Revoke all user sessions

## Prerequisites

- Microsoft 365 E3 license
- Teams application permissions
- Rapid7 Insight Connect instance
- Active Directory access
- Node.js 18+ and npm

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `env.example` to `.env` and configure your environment variables

4. Create the necessary directories:
   ```bash
   mkdir -p data logs
   ```

5. Register your Teams Bot in Azure AD and Teams

6. Start the application:
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

- **Teams Bot**: Bot ID, password, and app credentials
- **Microsoft Graph**: Tenant ID, client ID, and secret for Entra ID access
- **Rapid7**: Base URL and API key for Insight Connect
- **Chat IDs**: IT and HR team chat identifiers
- **Domains**: Active Directory domain configurations

### Teams App Manifest

The bot requires a Teams app manifest with appropriate permissions and bot capabilities.

## Security Features

- **MFA Required**: Every command execution requires multi-factor authentication
- **Role-Based Access**: Different command sets for different user groups
- **Audit Logging**: Complete audit trail of all actions
- **Session Management**: Secure token handling and validation

## Architecture

- **Bot Framework**: Microsoft Bot Framework v4
- **Authentication**: MSAL for Microsoft Graph API integration
- **Database**: SQLite for audit logging and session management
- **Logging**: Winston for comprehensive logging
- **API Integration**: Axios for Rapid7 Insight Connect communication

## Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3978
CMD ["npm", "start"]
```

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check Teams app registration and bot credentials
2. **Authentication errors**: Verify Microsoft Graph API permissions
3. **Command failures**: Check Rapid7 API connectivity and permissions
4. **MFA issues**: Ensure proper token validation and session management

### Logs

Check the logs directory for detailed error information and audit trails.

## Support

For technical support, contact your IT team or refer to the application logs.

## License

MIT License - see LICENSE file for details.
