# AD Commands Teams Bot Setup Guide

This guide will walk you through setting up the AD Commands Teams Bot from scratch.

## Prerequisites

- Microsoft 365 E3 license
- Azure subscription
- Node.js 18+ and npm
- Azure CLI (for deployment)
- Access to Microsoft Teams admin center
- Rapid7 Insight Connect instance

## Step 1: Azure Setup

### 1.1 Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: AD Commands Bot
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: Web > `https://yourdomain.com/auth/callback`
5. Click **Register**

### 1.2 Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions**
5. Add the following permissions:
   - `User.Read.All` - Read user profiles
   - `Directory.Read.All` - Read directory data
   - `Group.Read.All` - Read group memberships
6. Click **Grant admin consent**

### 1.3 Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and choose expiry
4. **Copy the secret value** (you won't see it again)

### 1.4 Note App Details

- **Application (client) ID**: Copy this value
- **Directory (tenant) ID**: Copy this value
- **Client secret**: The value you copied in step 1.3

## Step 2: Bot Framework Registration

### 2.1 Register Bot

1. Go to [Bot Framework Portal](https://dev.botframework.com/)
2. Click **Create a bot**
3. Fill in the details:
   - **Bot name**: AD Commands Bot
   - **Bot handle**: ad-commands-bot
   - **Description**: Active Directory management bot
4. Click **Create**
5. Note the **Bot handle** and **Microsoft App ID**

### 2.2 Configure Messaging Endpoint

1. In your bot registration, go to **Configuration**
2. Set **Messaging endpoint** to: `https://yourdomain.com/api/messages`
3. Save the changes

## Step 3: Rapid7 Insight Connect Configuration

### 3.1 Get API Credentials

1. Log into your Rapid7 Insight Connect instance
2. Go to **Settings** > **API Keys**
3. Create a new API key with appropriate permissions
4. Note the **Base URL** and **API Key**

### 3.2 Test API Connection

Use the provided test script or manually test the connection:

```bash
curl -X GET "https://your-rapid7-instance.insight.rapid7.com/api/v1/health" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Step 4: Environment Configuration

### 4.1 Create Environment File

1. Copy `env.example` to `.env`
2. Fill in all the required values:

```bash
# Teams Bot Configuration
BOT_ID=your-bot-id-from-bot-framework
BOT_PASSWORD=your-bot-password
TEAMS_APP_ID=your-teams-app-id
TEAMS_APP_PASSWORD=your-teams-app-password

# Microsoft Graph API Configuration
TENANT_ID=your-tenant-id-from-azure
CLIENT_ID=your-client-id-from-azure
CLIENT_SECRET=your-client-secret-from-azure

# Rapid7 Insight Connect Configuration
RAPID7_BASE_URL=https://your-rapid7-instance.insight.rapid7.com
RAPID7_API_KEY=your-rapid7-api-key

# Chat Configuration
IT_TEAM_CHAT_ID=your-it-team-chat-id
HR_TEAM_CHAT_ID=your-hr-team-chat-id

# Domain Configuration
DOMAIN_1=your-domain1.com
DOMAIN_2=your-domain2.com

# Security
JWT_SECRET=your-random-jwt-secret-key
```

### 4.2 Get Chat IDs

1. In Teams, go to the IT team chat
2. Right-click on the chat name
3. Select **Get link to chat**
4. Copy the chat ID from the URL
5. Repeat for HR team chat

## Step 5: Local Development

### 5.1 Install Dependencies

```bash
npm install
```

### 5.2 Create Directories

```bash
mkdir -p data logs
```

### 5.3 Start Development Server

```bash
npm run dev
```

### 5.4 Test Locally

1. Use [ngrok](https://ngrok.com/) to expose your local server
2. Update your bot's messaging endpoint with the ngrok URL
3. Test basic functionality

## Step 6: Azure Deployment

### 6.1 Deploy to Azure

Use the provided PowerShell script:

```powershell
.\deploy.ps1
```

Or manually deploy:

```bash
# Create resource group
az group create --name ADCommandsBot-RG --location EastUS

# Create app service plan
az appservice plan create --name ADCommandsBot-Plan --resource-group ADCommandsBot-RG --sku B1 --is-linux

# Create web app
az webapp create --name ad-commands-bot --resource-group ADCommandsBot-RG --plan ADCommandsBot-Plan --runtime "NODE|18-lts"

# Deploy your code
az webapp deployment source config-zip --resource-group ADCommandsBot-RG --name ad-commands-bot --src ./deploy.zip
```

### 6.2 Configure Environment Variables

1. In Azure Portal, go to your web app
2. Navigate to **Configuration** > **Application settings**
3. Add all environment variables from your `.env` file
4. Save the changes

## Step 7: Teams App Deployment

### 7.1 Update Manifest

1. Edit `teams-app-manifest/manifest.json`
2. Replace placeholder values:
   - `{{TEAMS_APP_ID}}` with your bot's app ID
   - `{{BOT_ID}}` with your bot's ID
   - `{{CLIENT_ID}}` with your Azure app registration client ID
   - `{{BOT_ENDPOINT}}` with your deployed bot URL

### 7.2 Package App

1. Create a ZIP file containing:
   - `manifest.json`
   - `color.png` (192x192)
   - `outline.png` (32x32)

### 7.3 Install in Teams

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com/)
2. Navigate to **Teams apps** > **Manage apps**
3. Click **Upload**
4. Upload your ZIP file
5. Approve the app for your organization

### 7.4 Add to Teams

1. In Teams, go to **Apps**
2. Find "AD Commands Bot"
3. Click **Add to a team**
4. Select your IT and HR team chats

## Step 8: Testing and Validation

### 8.1 Test Commands

1. In IT team chat, try:
   - `!unlock-user testuser`
   - `!enable-agent 192.168.1.100`

2. In HR team chat, try:
   - `!disable-user testuser`
   - `!revoke-sessions user@company.com`

### 8.2 Verify MFA

1. Ensure MFA is required for each command
2. Test session timeout functionality
3. Verify role-based access control

### 8.3 Check Logs

1. Review application logs in Azure
2. Check audit database for command history
3. Verify Rapid7 command execution

## Step 9: Monitoring and Maintenance

### 9.1 Set Up Alerts

1. Configure Azure Monitor alerts
2. Set up log analytics
3. Monitor bot performance

### 9.2 Regular Maintenance

1. Update dependencies monthly
2. Review audit logs weekly
3. Test Rapid7 connectivity regularly
4. Backup audit database

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check messaging endpoint and bot credentials
2. **Authentication errors**: Verify Microsoft Graph permissions
3. **Command failures**: Check Rapid7 API connectivity
4. **MFA issues**: Ensure proper token validation

### Debug Commands

```bash
# Check bot status
curl https://your-bot-url/health

# View logs
tail -f logs/bot.log

# Test database
sqlite3 data/ad-commands.db "SELECT * FROM command_logs LIMIT 5;"
```

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Rotate Rapid7 API keys regularly
3. **Access Control**: Regularly review user permissions
4. **Audit Logs**: Monitor for suspicious activity
5. **Network Security**: Use HTTPS and proper firewall rules

## Support

For technical support:
1. Check the application logs
2. Review this setup guide
3. Contact your IT team
4. Refer to Microsoft Teams and Bot Framework documentation

## Next Steps

After successful setup:
1. Train your IT and HR teams on usage
2. Document any customizations
3. Set up monitoring and alerting
4. Plan for future enhancements
