const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');
const { ADCommandsBot } = require('./bot');
const { logger } = require('./utils/logger');
const { initializeDatabase } = require('./database/init');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3978;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Create bot adapter
const adapter = new BotFrameworkAdapter({
    appId: process.env.BOT_ID,
    appPassword: process.env.BOT_PASSWORD
});

// Error handling
adapter.onTurnError = async (context, error) => {
    logger.error(`\n [onTurnError] unhandled error: ${error}`);
    logger.error(`\n [onTurnError] unhandled error: ${error.stack}`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${error}`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Create bot instance
const bot = new ADCommandsBot();

// Bot endpoint
app.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        await bot.run(context);
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize database and start server
async function startServer() {
    try {
        await initializeDatabase();
        logger.info('Database initialized successfully');
        
        app.listen(port, () => {
            logger.info(`AD Commands Teams Bot is running on port ${port}`);
            logger.info(`Health check available at http://localhost:${port}/health`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start the server
startServer();
