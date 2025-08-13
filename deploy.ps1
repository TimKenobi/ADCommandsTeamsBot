# AD Commands Teams Bot Deployment Script
# This script helps deploy the bot to Azure and Teams

param(
    [string]$ResourceGroupName = "ADCommandsBot-RG",
    [string]$Location = "East US",
    [string]$AppServicePlanName = "ADCommandsBot-Plan",
    [string]$WebAppName = "ad-commands-bot",
    [string]$BotName = "AD Commands Bot"
)

Write-Host "Starting deployment of AD Commands Teams Bot..." -ForegroundColor Green

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI is not installed. Please install it from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Check if user is logged in to Azure
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Please log in to Azure..." -ForegroundColor Yellow
    az login
}

# Set subscription if multiple exist
$subscriptions = az account list --query "[].{name:name, id:id, isDefault:isDefault}" | ConvertFrom-Json
if ($subscriptions.Count -gt 1) {
    Write-Host "Available subscriptions:" -ForegroundColor Cyan
    for ($i = 0; $i -lt $subscriptions.Count; $i++) {
        $default = if ($subscriptions[$i].isDefault) { " (Default)" } else { "" }
        Write-Host "$($i + 1). $($subscriptions[$i].name)$default" -ForegroundColor White
    }
    
    $selection = Read-Host "Select subscription number"
    $selectedSub = $subscriptions[[int]$selection - 1]
    az account set --subscription $selectedSub.id
    Write-Host "Selected subscription: $($selectedSub.name)" -ForegroundColor Green
}

# Create resource group
Write-Host "Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location

# Create App Service Plan
Write-Host "Creating App Service Plan: $AppServicePlanName" -ForegroundColor Yellow
az appservice plan create --name $AppServicePlanName --resource-group $ResourceGroupName --location $Location --sku B1 --is-linux

# Create Web App
Write-Host "Creating Web App: $WebAppName" -ForegroundColor Yellow
az webapp create --name $WebAppName --resource-group $ResourceGroupName --plan $AppServicePlanName --runtime "NODE|18-lts"

# Configure Web App
Write-Host "Configuring Web App..." -ForegroundColor Yellow
az webapp config set --name $WebAppName --resource-group $ResourceGroupName --startup-file "npm start"

# Get the web app URL
$webAppUrl = az webapp show --name $WebAppName --resource-group $ResourceGroupName --query "defaultHostName" -o tsv
Write-Host "Web App URL: https://$webAppUrl" -ForegroundColor Green

# Create Bot Registration
Write-Host "Creating Bot Registration..." -ForegroundColor Yellow
$botId = az bot create --name $BotName --resource-group $ResourceGroupName --appid "YOUR_APP_ID" --password "YOUR_APP_PASSWORD" --endpoint "https://$webAppUrl/api/messages" --sku F0 | ConvertFrom-Json

Write-Host "Bot created with ID: $($botId.appId)" -ForegroundColor Green

# Instructions for next steps
Write-Host "`nDeployment completed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env file with the following values:" -ForegroundColor White
Write-Host "   BOT_ENDPOINT=https://$webAppUrl"
Write-Host "   BOT_ID=$($botId.appId)"
Write-Host "   BOT_PASSWORD=YOUR_APP_PASSWORD"
Write-Host "   TEAMS_APP_ID=$($botId.appId)"
Write-Host "   TEAMS_APP_PASSWORD=YOUR_APP_PASSWORD"
Write-Host "`n2. Configure your Microsoft Graph API permissions in Azure AD" -ForegroundColor White
Write-Host "3. Update the Teams app manifest with your bot details" -ForegroundColor White
Write-Host "4. Deploy your bot code to the web app" -ForegroundColor White
Write-Host "5. Install the Teams app in your organization" -ForegroundColor White

Write-Host "`nFor detailed setup instructions, see the README.md file." -ForegroundColor Cyan
