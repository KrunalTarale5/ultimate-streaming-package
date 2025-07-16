const mysql = require('mysql2/promise');
const EventEmitter = require('events');
const ZongJi = require('zongji');

class AdvancedMysqlConnector extends EventEmitter {
  constructor() {
    super();
    this.connection = null;
    this.pool = null;
    this.connected = false;
    this.zongJi = null;
    this.activeWatchers = new Map(); // key -> watcher info
    this.keyToTableMap = new Map(); // key -> table info
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000;
    this.config = null;
    this.healthCheckInterval = null;
    this.metrics = {
      changesProcessed: 0,
      reconnections: 0,
      errorsHandled: 0,
      activeWatchers: 0,
      binlogPosition: null
    };
    this.lastKnownState = new Map(); // key -> data for change detection
  }

  async connect(config) {
    try {
      this.config = { ...config };
      const { host, port, user, password, database } = config;
      
      // Create connection pool for better performance
      const poolConfig = {
        host: host,
        port: port || 3306,
        user: user,
        password: password,
        database: database,
        charset: 'utf8mb4',
        timezone: '+00:00',
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
        connectionLimit: config.connectionLimit || 50,
        queueLimit: config.queueLimit || 0,
        idleTimeout: config.idleTimeout || 300000,
        acquireTimeout: config.acquireTimeout || 60000,
        timeout: config.timeout || 60000
      };

      this.pool = mysql.createPool(poolConfig);
      this.connection = await this.pool.getConnection();
      this.connected = true;
      this.retryCount = 0;

      // Create the stream_data table with optimized schema
      await this.createOptimizedTable();
      
      // Set up binlog monitoring
      await this.setupBinlogMonitoring();
      
      // Start health checks
      this.startHealthChecks();
      
      console.log('Advanced MySQL connected successfully with real-time binlog monitoring');
      this.emit('connected');
      return true;
    } catch (error) {
      console.error('Advanced MySQL connection failed:', error.message);
      this.connected = false;
      await this.handleConnectionError(error);
      throw error;
    }
  }

  async createOptimizedTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS stream_data (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          \`key\` VARCHAR(255) NOT NULL UNIQUE,
          data JSON NOT NULL,
          timestamp DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
          last_modified DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          ttl DATETIME(6) NULL,
          tags JSON DEFAULT NULL,
          metadata JSON DEFAULT NULL,
          checksum CHAR(32) GENERATED ALWAYS AS (MD5(JSON_UNQUOTE(data))) STORED,
          
          INDEX idx_key (\`key\`),
          INDEX idx_last_modified (last_modified),
          INDEX idx_timestamp (timestamp),
          INDEX idx_ttl (ttl),
          INDEX idx_checksum (checksum),
          INDEX idx_compound (\`key\`, last_modified),
          FULLTEXT idx_data_text (data)
        ) ENGINE=InnoDB 
          DEFAULT CHARSET=utf8mb4 
          COLLATE=utf8mb4_unicode_ci
          ROW_FORMAT=DYNAMIC;
      `;
      
      await this.connection.execute(createTableQuery);

      // Create TTL cleanup event
      await this.setupTTLCleanup();
      
      console.log('Optimized MySQL table created successfully');
    } catch (error) {
      console.error('MySQL table creation error:', error.message);
      throw error;
    }
  }

  async setupTTLCleanup() {
    try {
      // Create event scheduler for TTL cleanup (runs every 5 minutes)
      const cleanupEvent = `
        CREATE EVENT IF NOT EXISTS cleanup_expired_data
        ON SCHEDULE EVERY 5 MINUTE
        STARTS CURRENT_TIMESTAMP
        DO
          DELETE FROM stream_data WHERE ttl IS NOT NULL AND ttl < NOW();
      `;
      
      await this.connection.execute('SET GLOBAL event_scheduler = ON');
      await this.connection.execute(cleanupEvent);
      console.log('TTL cleanup event created successfully');
    } catch (error) {
      console.warn('TTL cleanup setup warning:', error.message);
    }
  }

  async setupBinlogMonitoring() {
    try {
      // Release the connection back to pool for ZongJi to use
      this.connection.release();
      
      const zongJiConfig = {
        host: this.config.host,
        port: this.config.port || 3306,
        user: this.config.user,
        password: this.config.password,
        charset: 'utf8mb4_unicode_ci',
        includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows'],
        includeSchema: {
          [this.config.database]: ['stream_data']
        },
        serverId: this.config.serverId || Math.floor(Math.random() * 1000) + 1
      };

      this.zongJi = new ZongJi(zongJiConfig);

      // Handle binlog events
      this.zongJi.on('binlog', (evt) => {
        this.handleBinlogEvent(evt);
      });

      this.zongJi.on('error', (error) => {
        console.error('Binlog monitoring error:', error);
        this.metrics.errorsHandled++;
        this.handleBinlogError(error);
      });

      this.zongJi.on('ready', () => {
        console.log('MySQL binlog monitoring started successfully');
        this.emit('binlogReady');
      });

      // Start monitoring
      this.zongJi.start({
        startAtEnd: false,
        includeEvents: ['tablemap', 'writerows', 'updaterows', 'deleterows']
      });

      console.log('MySQL binlog monitoring initialized');
    } catch (error) {
      console.error('Binlog setup error:', error.message);
      // Fallback to polling if binlog fails
      console.log('Falling back to polling mode...');
      this.setupPollingFallback();
    }
  }

  setupPollingFallback() {
    // Implement polling as fallback when binlog is not available
    this.pollingInterval = setInterval(async () => {
      for (const [key, watcherInfo] of this.activeWatchers) {
        try {
          await this.checkKeyForChanges(key, watcherInfo);
        } catch (error) {
          console.error(`Polling error for key ${key}:`, error);
        }
      }
    }, this.config.pollingInterval || 2000);
  }

  async checkKeyForChanges(key, watcherInfo) {
    try {
      const currentData = await this.readData(key);
      const lastKnownData = this.lastKnownState.get(key);
      
      if (!currentData && !lastKnownData) return;
      
      // Detect changes
      if (!currentData && lastKnownData) {
        // Deleted
        this.lastKnownState.delete(key);
        this.notifyWatcher(key, null, 'deleted', watcherInfo);
      } else if (currentData && !lastKnownData) {
        // Created
        this.lastKnownState.set(key, currentData);
        this.notifyWatcher(key, currentData.data, 'created', watcherInfo);
      } else if (currentData && lastKnownData) {
        // Check for updates
        if (currentData.checksum !== lastKnownData.checksum) {
          this.lastKnownState.set(key, currentData);
          this.notifyWatcher(key, currentData.data, 'updated', watcherInfo);
        }
      }
    } catch (error) {
      console.error(`Error checking changes for key ${key}:`, error);
    }
  }

  handleBinlogEvent(evt) {
    try {
      if (evt.getEventName() === 'writerows' || 
          evt.getEventName() === 'updaterows' || 
          evt.getEventName() === 'deleterows') {
        
        this.metrics.changesProcessed++;
        this.metrics.binlogPosition = evt.nextPosition;
        
        const tableName = evt.tableMap[evt.tableId].tableName;
        
        if (tableName === 'stream_data') {
          this.processBinlogDataChange(evt);
        }
      }
    } catch (error) {
      console.error('Error processing binlog event:', error);
      this.metrics.errorsHandled++;
    }
  }

  processBinlogDataChange(evt) {
    const eventName = evt.getEventName();
    const rows = evt.rows;
    
    for (const row of rows) {
      try {
        let key, data, changeType;
        
        if (eventName === 'writerows') {
          // INSERT
          key = row.key;
          data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          changeType = 'created';
        } else if (eventName === 'updaterows') {
          // UPDATE
          key = row.after.key;
          data = typeof row.after.data === 'string' ? JSON.parse(row.after.data) : row.after.data;
          changeType = 'updated';
        } else if (eventName === 'deleterows') {
          // DELETE
          key = row.key;
          data = null;
          changeType = 'deleted';
        }
        
        // Notify watchers for this key
        const watcherInfo = this.activeWatchers.get(key);
        if (watcherInfo) {
          this.notifyWatcher(key, data, changeType, watcherInfo);
        }
        
        // Emit global change event
        this.emit('change', { key, data, changeType });
        
      } catch (error) {
        console.error('Error processing binlog row:', error);
      }
    }
  }

  notifyWatcher(key, data, changeType, watcherInfo) {
    try {
      const meta = {
        key: key,
        changeType: changeType,
        timestamp: new Date(),
        source: this.zongJi ? 'binlog' : 'polling',
        binlogPosition: this.metrics.binlogPosition
      };
      
      watcherInfo.callback(data, meta);
    } catch (error) {
      console.error(`Error in watcher callback for key ${key}:`, error);
    }
  }

  async handleBinlogError(error) {
    console.error('Binlog error occurred:', error);
    
    // Attempt to restart binlog monitoring
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
      
      console.log(`Restarting binlog monitoring (attempt ${this.retryCount}/${this.maxRetries}) in ${delay}ms...`);
      
      setTimeout(async () => {
        try {
          if (this.zongJi) {
            this.zongJi.stop();
          }
          await this.setupBinlogMonitoring();
          this.retryCount = 0;
        } catch (retryError) {
          console.error('Binlog restart failed:', retryError.message);
        }
      }, delay);
    } else {
      console.error('Max binlog retry attempts reached, falling back to polling');
      this.setupPollingFallback();
    }
  }

  async handleConnectionError(error) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
      
      console.log(`Reconnecting to MySQL (attempt ${this.retryCount}/${this.maxRetries}) in ${delay}ms...`);
      
      setTimeout(async () => {
        try {
          await this.connect(this.config);
          this.metrics.reconnections++;
        } catch (retryError) {
          console.error('Reconnection failed:', retryError.message);
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxRetriesReached', error);
    }
  }

  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const connection = await this.pool.getConnection();
        await connection.execute('SELECT 1');
        connection.release();
        
        this.emit('healthCheck', { 
          status: 'healthy', 
          metrics: this.getMetrics(),
          binlogActive: !!this.zongJi
        });
      } catch (error) {
        console.error('Health check failed:', error);
        this.emit('healthCheck', { 
          status: 'unhealthy', 
          error: error.message,
          binlogActive: !!this.zongJi
        });
      }
    }, 30000);
  }

  async writeData(key, data, options = {}) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const connection = await this.pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        const query = `
          INSERT INTO stream_data (\`key\`, data, timestamp, last_modified, ttl, tags, metadata)
          VALUES (?, ?, NOW(6), NOW(6), ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            data = VALUES(data),
            last_modified = NOW(6),
            ttl = VALUES(ttl),
            tags = VALUES(tags),
            metadata = VALUES(metadata)
        `;
        
        const ttl = options.ttl ? new Date(Date.now() + options.ttl * 1000) : null;
        const tags = options.tags ? JSON.stringify(options.tags) : null;
        const metadata = options.metadata ? JSON.stringify(options.metadata) : null;
        
        const [result] = await connection.execute(query, [
          key,
          JSON.stringify(data),
          ttl,
          tags,
          metadata
        ]);
        
        await connection.commit();
        
        return {
          success: true,
          key: key,
          upserted: result.insertId > 0,
          modified: result.changedRows > 0,
          timestamp: new Date()
        };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('MySQL write error:', error.message);
      this.metrics.errorsHandled++;
      throw error;
    }
  }

  async readData(key) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const connection = await this.pool.getConnection();
      
      try {
        const query = `
          SELECT \`key\`, data, timestamp, last_modified, ttl, tags, metadata, checksum
          FROM stream_data 
          WHERE \`key\` = ? AND (ttl IS NULL OR ttl > NOW())
        `;
        
        const [rows] = await connection.execute(query, [key]);
        
        if (rows.length === 0) {
          return null;
        }

        const row = rows[0];
        return {
          key: row.key,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          lastModified: row.last_modified,
          ttl: row.ttl,
          tags: row.tags ? JSON.parse(row.tags) : [],
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          checksum: row.checksum
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('MySQL read error:', error.message);
      throw error;
    }
  }

  async startRealTimeWatch(key, callback, options = {}) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      // Store watcher info
      this.activeWatchers.set(key, { callback, options });
      this.metrics.activeWatchers++;
      
      // Get initial data and store in cache
      const initialData = await this.readData(key);
      if (initialData) {
        this.lastKnownState.set(key, initialData);
        const meta = {
          key: key,
          changeType: 'initial',
          timestamp: new Date(),
          source: 'initial'
        };
        callback(initialData.data, meta);
      }

      console.log(`Real-time MySQL watch started for key: ${key}`);
      
      // If binlog is not available, the polling fallback will handle this
      return { key, active: true };
      
    } catch (error) {
      console.error(`Failed to start MySQL watch for key ${key}:`, error);
      this.activeWatchers.delete(key);
      throw error;
    }
  }

  async stopWatch(key) {
    if (this.activeWatchers.has(key)) {
      this.activeWatchers.delete(key);
      this.lastKnownState.delete(key);
      this.metrics.activeWatchers--;
      console.log(`Stopped watching key: ${key}`);
    }
  }

  async queryData(query = {}, options = {}) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const connection = await this.pool.getConnection();
      
      try {
        const { sql, params } = this.buildMySQLQuery(query, options);
        const [rows] = await connection.execute(sql, params);
        
        return rows.map(row => ({
          key: row.key,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          lastModified: row.last_modified,
          tags: row.tags ? JSON.parse(row.tags) : [],
          metadata: row.metadata ? JSON.parse(row.metadata) : {}
        }));
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('MySQL query error:', error.message);
      throw error;
    }
  }

  buildMySQLQuery(query, options) {
    let sql = 'SELECT * FROM stream_data WHERE (ttl IS NULL OR ttl > NOW())';
    const params = [];
    
    if (query.keys) {
      const keys = Array.isArray(query.keys) ? query.keys : [query.keys];
      sql += ` AND \`key\` IN (${keys.map(() => '?').join(',')})`;
      params.push(...keys);
    }
    
    if (query.keyPattern) {
      sql += ' AND `key` LIKE ?';
      params.push(query.keyPattern.replace(/\*/g, '%'));
    }
    
    if (query.tags) {
      const tags = Array.isArray(query.tags) ? query.tags : [query.tags];
      sql += ` AND JSON_OVERLAPS(tags, ?)`;
      params.push(JSON.stringify(tags));
    }
    
    if (query.since) {
      sql += ' AND last_modified >= ?';
      params.push(new Date(query.since));
    }
    
    if (query.until) {
      sql += ' AND last_modified <= ?';
      params.push(new Date(query.until));
    }
    
    if (query.data) {
      for (const [field, value] of Object.entries(query.data)) {
        sql += ` AND JSON_EXTRACT(data, ?) = ?`;
        params.push(`$.${field}`, value);
      }
    }
    
    // Add ordering
    const sortField = options.sort?.field || 'last_modified';
    const sortOrder = options.sort?.order || 'DESC';
    sql += ` ORDER BY ${sortField} ${sortOrder}`;
    
    // Add pagination
    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
      
      if (options.skip) {
        sql += ' OFFSET ?';
        params.push(options.skip);
      }
    }
    
    return { sql, params };
  }

  async getAllKeys() {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const connection = await this.pool.getConnection();
      
      try {
        const query = `
          SELECT \`key\`, last_modified, tags 
          FROM stream_data 
          WHERE (ttl IS NULL OR ttl > NOW())
          ORDER BY last_modified DESC
        `;
        
        const [rows] = await connection.execute(query);
        
        return rows.map(row => ({
          key: row.key,
          lastModified: row.last_modified,
          tags: row.tags ? JSON.parse(row.tags) : []
        }));
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('MySQL getAllKeys error:', error.message);
      throw error;
    }
  }

  async deleteData(key) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const connection = await this.pool.getConnection();
      
      try {
        const query = 'DELETE FROM stream_data WHERE `key` = ?';
        const [result] = await connection.execute(query, [key]);
        
        return {
          success: true,
          deleted: result.affectedRows > 0
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('MySQL delete error:', error.message);
      throw error;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeWatchers: this.activeWatchers.size,
      isConnected: this.connected,
      retryCount: this.retryCount,
      binlogActive: !!this.zongJi,
      poolConnections: this.pool ? {
        all: this.pool.pool._allConnections.length,
        free: this.pool.pool._freeConnections.length,
        used: this.pool.pool._allConnections.length - this.pool.pool._freeConnections.length
      } : null
    };
  }

  async disconnect() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    if (this.zongJi) {
      this.zongJi.stop();
      this.zongJi = null;
    }

    this.activeWatchers.clear();
    this.lastKnownState.clear();

    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      console.log('Advanced MySQL disconnected');
    }
  }

  isConnected() {
    return this.connected && this.pool;
  }
}

module.exports = AdvancedMysqlConnector; 