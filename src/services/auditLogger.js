const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { logger } = require('../utils/logger');

class AuditLogger {
    constructor() {
        this.dbPath = process.env.DB_PATH || './data/ad-commands.db';
        this.db = null;
        this.initDatabase();
    }

    async initDatabase() {
        try {
            this.db = new sqlite3.Database(this.dbPath);
            
            // Create tables if they don't exist
            await this.createTables();
            
            logger.info('Audit database initialized successfully');
        } catch (error) {
            logger.error('Error initializing audit database:', error);
            throw error;
        }
    }

    createTables() {
        return new Promise((resolve, reject) => {
            const commandsTable = `
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
            `;

            const userSessionsTable = `
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
            `;

            const rapid7CommandsTable = `
                CREATE TABLE IF NOT EXISTS rapid7_commands (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    commandId TEXT UNIQUE,
                    command TEXT NOT NULL,
                    userId TEXT NOT NULL,
                    userName TEXT NOT NULL,
                    status TEXT NOT NULL,
                    response TEXT,
                    error TEXT,
                    executionTime INTEGER,
                    timestamp TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const userLookupsTable = `
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
            `;

            this.db.serialize(() => {
                this.db.run(commandsTable, (err) => {
                    if (err) {
                        logger.error('Error creating commands table:', err);
                        reject(err);
                    }
                });

                this.db.run(userSessionsTable, (err) => {
                    if (err) {
                        logger.error('Error creating user_sessions table:', err);
                        reject(err);
                    }
                });

                this.db.run(rapid7CommandsTable, (err) => {
                    if (err) {
                        logger.error('Error creating rapid7_commands table:', err);
                        reject(err);
                    }
                });

                this.db.run(userLookupsTable, (err) => {
                    if (err) {
                        logger.error('Error creating user_lookups table:', err);
                        reject(err);
                    }
                });

                // Create indexes for better performance
                this.db.run('CREATE INDEX IF NOT EXISTS idx_command_logs_userId ON command_logs(userId)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_command_logs_timestamp ON command_logs(timestamp)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_command_logs_chatId ON command_logs(chatId)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_user_sessions_sessionId ON user_sessions(sessionId)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_rapid7_commands_commandId ON rapid7_commands(commandId)');

                resolve();
            });
        });
    }

    async logCommand(logData) {
        try {
            const { userId, userName, chatId, command, result, details, ipAddress, userAgent, sessionId } = logData;
            
            const sql = `
                INSERT INTO command_logs 
                (timestamp, userId, userName, chatId, command, result, details, ipAddress, userAgent, sessionId)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                new Date().toISOString(),
                userId,
                userName,
                chatId,
                command,
                result,
                details || '',
                ipAddress || '',
                userAgent || '',
                sessionId || ''
            ];

            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) {
                        logger.error('Error logging command:', err);
                        reject(err);
                    } else {
                        logger.info(`Command logged with ID: ${this.lastID}`);
                        resolve(this.lastID);
                    }
                });
            });

        } catch (error) {
            logger.error('Error in logCommand:', error);
            throw error;
        }
    }

    async logUserSession(sessionData) {
        try {
            const { sessionId, userId, userName, chatId, ipAddress, userAgent, mfaVerified } = sessionData;
            
            const sql = `
                INSERT INTO user_sessions 
                (sessionId, userId, userName, chatId, loginTime, ipAddress, userAgent, mfaVerified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                sessionId,
                userId,
                userName,
                chatId,
                new Date().toISOString(),
                ipAddress || '',
                userAgent || '',
                mfaVerified ? 1 : 0
            ];

            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) {
                        logger.error('Error logging user session:', err);
                        reject(err);
                    } else {
                        logger.info(`User session logged with ID: ${this.lastID}`);
                        resolve(this.lastID);
                    }
                });
            });

        } catch (error) {
            logger.error('Error in logUserSession:', error);
            throw error;
        }
    }

    async logRapid7Command(commandData) {
        try {
            const { commandId, command, userId, userName, status, response, error, executionTime } = commandData;
            
            const sql = `
                INSERT INTO rapid7_commands 
                (commandId, command, userId, userName, status, response, error, executionTime, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                commandId || '',
                command,
                userId,
                userName,
                status,
                response ? JSON.stringify(response) : '',
                error || '',
                executionTime || 0,
                new Date().toISOString()
            ];

            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) {
                        logger.error('Error logging Rapid7 command:', err);
                        reject(err);
                    } else {
                        logger.info(`Rapid7 command logged with ID: ${this.lastID}`);
                        resolve(this.lastID);
                    }
                });
            });

        } catch (error) {
            logger.error('Error in logRapid7Command:', error);
            throw error;
        }
    }

    async logUserLookup(lookupData) {
        try {
            const { lookupType, lookupValue, userId, userName, result, userFound, targetUserInfo } = lookupData;
            
            const sql = `
                INSERT INTO user_lookups 
                (lookupType, lookupValue, userId, userName, result, userFound, targetUserInfo, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                lookupType,
                lookupValue,
                userId,
                userName,
                result,
                userFound ? 1 : 0,
                targetUserInfo ? JSON.stringify(targetUserInfo) : '',
                new Date().toISOString()
            ];

            return new Promise((resolve, reject) => {
                this.db.run(sql, params, function(err) {
                    if (err) {
                        logger.error('Error logging user lookup:', err);
                        reject(err);
                    } else {
                        logger.info(`User lookup logged with ID: ${this.lastID}`);
                        resolve(this.lastID);
                    }
                });
            });

        } catch (error) {
            logger.error('Error in logUserLookup:', error);
            throw error;
        }
    }

    async getCommandHistory(userId = null, limit = 100) {
        try {
            let sql = 'SELECT * FROM command_logs';
            let params = [];

            if (userId) {
                sql += ' WHERE userId = ?';
                params.push(userId);
            }

            sql += ' ORDER BY timestamp DESC LIMIT ?';
            params.push(limit);

            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) {
                        logger.error('Error getting command history:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

        } catch (error) {
            logger.error('Error in getCommandHistory:', error);
            throw error;
        }
    }

    async getAuditReport(startDate, endDate, userId = null) {
        try {
            let sql = `
                SELECT 
                    cl.*,
                    us.sessionId,
                    us.ipAddress,
                    us.userAgent
                FROM command_logs cl
                LEFT JOIN user_sessions us ON cl.sessionId = us.sessionId
                WHERE cl.timestamp BETWEEN ? AND ?
            `;
            
            let params = [startDate, endDate];

            if (userId) {
                sql += ' AND cl.userId = ?';
                params.push(userId);
            }

            sql += ' ORDER BY cl.timestamp DESC';

            return new Promise((resolve, reject) => {
                this.db.all(sql, params, (err, rows) => {
                    if (err) {
                        logger.error('Error getting audit report:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                });
            });

        } catch (error) {
            logger.error('Error in getAuditReport:', error);
            throw error;
        }
    }

    async closeDatabase() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    logger.error('Error closing database:', err);
                } else {
                    logger.info('Database connection closed');
                }
            });
        }
    }
}

module.exports = { AuditLogger };
