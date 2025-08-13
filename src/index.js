const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const { BotFrameworkAdapter, MemoryStorage, ConversationState, UserState } = require('botbuilder');
const { ADCommandsBot } = require('./bot');
const { logger } = require('./utils/logger');
const { initializeDatabase } = require('./database/init');
const { AuditLogger } = require('./services/auditLogger');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3978;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files for web GUI
app.use('/static', express.static(path.join(__dirname, '../public')));

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

// Web GUI Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API endpoints for web GUI
app.get('/api/audit-logs', async (req, res) => {
    try {
        const auditLogger = new AuditLogger();
        const { startDate, endDate, userId, limit = 100 } = req.query;
        
        let logs;
        if (startDate && endDate) {
            logs = await auditLogger.getAuditReport(startDate, endDate, userId);
        } else {
            logs = await auditLogger.getCommandHistory(userId, limit);
        }
        
        res.json({ success: true, data: logs });
    } catch (error) {
        logger.error('Error fetching audit logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const auditLogger = new AuditLogger();
        // Get basic statistics
        const stats = {
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            uniqueUsers: 0,
            lastCommand: null
        };
        
        res.json({ success: true, data: stats });
    } catch (error) {
        logger.error('Error fetching stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Serve the main web GUI
app.get('/gui', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/gui.html'));
});

// Initialize database and start server
async function startServer() {
    try {
        await initializeDatabase();
        logger.info('Database initialized successfully');
        
        app.listen(port, () => {
            logger.info(`AD Commands Teams Bot is running on port ${port}`);
            logger.info(`Health check available at http://localhost:${port}/health`);
            logger.info(`Web GUI available at http://localhost:${port}/gui`);
            logger.info(`Main page available at http://localhost:${port}/`);
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
