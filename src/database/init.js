const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

async function initializeDatabase() {
    try {
        const dbPath = process.env.DB_PATH || './data/ad-commands.db';
        const dbDir = path.dirname(dbPath);
        
        // Ensure database directory exists
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            logger.info(`Created database directory: ${dbDir}`);
        }

        // Create database connection
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                logger.error('Error opening database:', err);
                throw err;
            }
            logger.info(`Connected to database: ${dbPath}`);
        });

        // Create tables
        await createTables(db);
        
        // Close the connection
        db.close((err) => {
            if (err) {
                logger.error('Error closing database:', err);
            } else {
                logger.info('Database initialization completed');
            }
        });

    } catch (error) {
        logger.error('Database initialization failed:', error);
        throw error;
    }
}

function createTables(db) {
    return new Promise((resolve, reject) => {
        const tables = [
            {
                name: 'command_logs',
                sql: `
                    CREATE TABLE IF NOT EXISTS command_logs (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        userId TEXT NOT NULL,
                        userName TEXT NOT NULL,
                        chatId TEXT NOT NULL,
                        command TEXT NOT NULL,
                        result TEXT NOT NULL,
                        details TEXT,
                        ipAddress TEXT,
                        userAgent TEXT,
                        sessionId TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'user_sessions',
                sql: `
                    CREATE TABLE IF NOT EXISTS user_sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sessionId TEXT UNIQUE NOT NULL,
                        userId TEXT NOT NULL,
                        userName TEXT NOT NULL,
                        chatId TEXT NOT NULL,
                        loginTime TEXT NOT NULL,
                        logoutTime TEXT,
                        ipAddress TEXT,
                        userAgent TEXT,
                        mfaVerified BOOLEAN DEFAULT 0,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'teams_commands',
                sql: `
                    CREATE TABLE IF NOT EXISTS teams_commands (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        commandId TEXT UNIQUE,
                        command TEXT NOT NULL,
                        userId TEXT NOT NULL,
                        userName TEXT NOT NULL,
                        status TEXT NOT NULL,
                        channelId TEXT,
                        department TEXT,
                        timestamp TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'user_lookups',
                sql: `
                    CREATE TABLE IF NOT EXISTS user_lookups (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        lookupType TEXT NOT NULL,
                        lookupValue TEXT NOT NULL,
                        userId TEXT NOT NULL,
                        userName TEXT NOT NULL,
                        result TEXT NOT NULL,
                        userFound BOOLEAN,
                        targetUserInfo TEXT,
                        timestamp TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `
            },
            {
                name: 'system_config',
                sql: `
                    CREATE TABLE IF NOT EXISTS system_config (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        config_key TEXT UNIQUE NOT NULL,
                        config_value TEXT NOT NULL,
                        description TEXT,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_by TEXT
                    )
                `
            }
        ];

        let completedTables = 0;
        const totalTables = tables.length;

        tables.forEach(table => {
            db.run(table.sql, function(err) {
                if (err) {
                    logger.error(`Error creating table ${table.name}:`, err);
                    reject(err);
                } else {
                    logger.info(`Table ${table.name} created/verified successfully`);
                    completedTables++;
                    
                    if (completedTables === totalTables) {
                        // Create indexes
                        createIndexes(db).then(() => {
                            // Insert default configuration
                            insertDefaultConfig(db).then(() => {
                                resolve();
                            }).catch(reject);
                        }).catch(reject);
                    }
                }
            });
        });
    });
}

function createIndexes(db) {
    return new Promise((resolve, reject) => {
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_command_logs_userId ON command_logs(userId)',
            'CREATE INDEX IF NOT EXISTS idx_command_logs_timestamp ON command_logs(timestamp)',
            'CREATE INDEX IF NOT EXISTS idx_command_logs_chatId ON command_logs(chatId)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_sessionId ON user_sessions(sessionId)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_userId ON user_sessions(userId)',
            'CREATE INDEX IF NOT EXISTS idx_teams_commands_commandId ON teams_commands(commandId)',
            'CREATE INDEX IF NOT EXISTS idx_teams_commands_userId ON teams_commands(userId)',
            'CREATE INDEX IF NOT EXISTS idx_user_lookups_userId ON user_lookups(userId)',
            'CREATE INDEX IF NOT EXISTS idx_user_lookups_timestamp ON user_lookups(timestamp)'
        ];

        let completedIndexes = 0;
        const totalIndexes = indexes.length;

        indexes.forEach(indexSql => {
            db.run(indexSql, function(err) {
                if (err) {
                    logger.error('Error creating index:', err);
                    reject(err);
                } else {
                    completedIndexes++;
                    if (completedIndexes === totalIndexes) {
                        logger.info('All database indexes created successfully');
                        resolve();
                    }
                }
            });
        });
    });
}

function insertDefaultConfig(db) {
    return new Promise((resolve, reject) => {
        const defaultConfigs = [
            {
                key: 'bot_version',
                value: '1.0.0',
                description: 'Current bot version'
            },
            {
                key: 'session_timeout',
                value: '3600000',
                description: 'Session timeout in milliseconds (1 hour)'
            },
            {
                key: 'max_commands_per_hour',
                value: '100',
                description: 'Maximum commands allowed per hour per user'
            },
            {
                key: 'audit_retention_days',
                value: '365',
                description: 'Number of days to retain audit logs'
            }
        ];

        let completedConfigs = 0;
        const totalConfigs = defaultConfigs.length;

        defaultConfigs.forEach(config => {
            const sql = `
                INSERT OR REPLACE INTO system_config (config_key, config_value, description)
                VALUES (?, ?, ?)
            `;
            
            db.run(sql, [config.key, config.value, config.description], function(err) {
                if (err) {
                    logger.error(`Error inserting config ${config.key}:`, err);
                    reject(err);
                } else {
                    completedConfigs++;
                    if (completedConfigs === totalConfigs) {
                        logger.info('Default configuration inserted successfully');
                        resolve();
                    }
                }
            });
        });
    });
}

module.exports = { initializeDatabase };
