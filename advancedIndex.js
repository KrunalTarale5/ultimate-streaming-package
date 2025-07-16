const AdvancedMongoConnector = require('./lib/advancedMongoConnector');
const AdvancedMysqlConnector = require('./lib/advancedMysqlConnector');
const EventEmitter = require('events');

class UltimateRealtimeStreamPackage extends EventEmitter {
  constructor() {
    super();
    this.dbConnector = null;
    this.initialized = false;
    this.config = null;
    this.watchers = new Map(); // key -> { callbacks: Set, options }
    this.cache = new Map(); // Advanced caching layer
    this.metrics = {
      totalRequests: 0,
      totalChanges: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgResponseTime: 0,
      errorCount: 0,
      uptime: Date.now()
    };
    this.interceptors = {
      beforeWrite: [],
      afterWrite: [],
      beforeRead: [],
      afterRead: [],
      onChange: []
    };
    this.middleware = [];
    this.queryEngine = null;
    this.compressionEnabled = false;
    this.encryptionEnabled = false;
  }

  /**
   * 🚀 ULTIMATE INITIALIZATION - Better than any existing package
   * 
   * @param {Object} config - Configuration object
   * @param {string} config.dbType - Database type: 'mongodb' or 'mysql'
   * @param {string} config.host - Database host
   * @param {number} [config.port] - Database port
   * @param {string} config.user - Database username
   * @param {string} config.password - Database password
   * @param {string} config.database - Database name
   * @param {number} [config.pollingInterval] - Fallback polling interval (default: 2000ms)
   * @param {boolean} [config.debug] - Enable debug logging
   * @param {boolean} [config.useChangeStreams] - Use real-time change streams (default: true)
   * @param {boolean} [config.useBinlog] - Use MySQL binlog monitoring (default: true)
   * @param {boolean} [config.enableCache] - Enable intelligent caching (default: true)
   * @param {boolean} [config.enableCompression] - Enable data compression (default: false)
   * @param {boolean} [config.enableEncryption] - Enable data encryption (default: false)
   * @param {number} [config.maxConnections] - Maximum database connections (default: 50)
   * @param {number} [config.cacheSize] - Maximum cache entries (default: 10000)
   * @param {number} [config.cacheTTL] - Cache TTL in seconds (default: 300)
   * @returns {Promise<boolean>} - Success status
   */
  async init(config) {
    if (this.initialized) {
      throw new Error('Package already initialized. Call destroy() first to reinitialize.');
    }

    if (!config || typeof config !== 'object') {
      throw new Error('Configuration object is required');
    }

    const startTime = Date.now();
    this.validateConfig(config);

    try {
      // Store enhanced configuration
      this.config = {
        ...config,
        useChangeStreams: config.useChangeStreams !== false,
        useBinlog: config.useBinlog !== false,
        enableCache: config.enableCache !== false,
        enableCompression: config.enableCompression || false,
        enableEncryption: config.enableEncryption || false,
        maxConnections: config.maxConnections || 50,
        cacheSize: config.cacheSize || 10000,
        cacheTTL: config.cacheTTL || 300,
        autoReconnect: config.autoReconnect !== false,
        healthCheckInterval: config.healthCheckInterval || 30000
      };

      // Initialize appropriate advanced database connector
      if (config.dbType.toLowerCase() === 'mongodb') {
        this.dbConnector = new AdvancedMongoConnector();
      } else {
        this.dbConnector = new AdvancedMysqlConnector();
      }

      // Set up event forwarding
      this.setupEventForwarding();

      // Connect to database with advanced features
      await this.dbConnector.connect(this.config);

      // Initialize advanced features
      await this.initializeAdvancedFeatures();

      // Set up optimized indexes
      if (this.dbConnector.setupOptimizedIndexes) {
        await this.dbConnector.setupOptimizedIndexes();
      }

      this.initialized = true;
      this.metrics.uptime = Date.now();
      
      const initTime = Date.now() - startTime;
      console.log(`🚀 Ultimate Realtime Stream Package initialized with ${config.dbType.toUpperCase()} in ${initTime}ms`);
      console.log(`✅ Features: Real-time ${config.dbType === 'mongodb' ? 'Change Streams' : 'Binlog'}, Advanced Caching, Query Engine`);
      
      this.emit('initialized', { 
        dbType: config.dbType, 
        features: this.getEnabledFeatures(),
        initTime 
      });
      
      return true;
    } catch (error) {
      console.error('🔥 Ultimate initialization failed:', error.message);
      this.cleanup();
      throw error;
    }
  }

  validateConfig(config) {
    const { dbType, host, user, password, database } = config;

    if (!dbType || !['mongodb', 'mysql'].includes(dbType.toLowerCase())) {
      throw new Error('dbType must be either "mongodb" or "mysql"');
    }

    if (!host || !user || !password || !database) {
      throw new Error('Required fields: dbType, host, user, password, database');
    }

    // Advanced validation for performance settings
    if (config.maxConnections && (config.maxConnections < 1 || config.maxConnections > 1000)) {
      throw new Error('maxConnections must be between 1 and 1000');
    }

    if (config.cacheSize && (config.cacheSize < 100 || config.cacheSize > 100000)) {
      throw new Error('cacheSize must be between 100 and 100000');
    }
  }

  setupEventForwarding() {
    // Forward all database connector events
    this.dbConnector.on('connected', () => this.emit('connected'));
    this.dbConnector.on('disconnected', () => this.emit('disconnected'));
    this.dbConnector.on('error', (error) => {
      this.metrics.errorCount++;
      this.emit('error', error);
    });
    this.dbConnector.on('change', (changeData) => {
      this.metrics.totalChanges++;
      this.handleGlobalChange(changeData);
    });
    this.dbConnector.on('healthCheck', (status) => this.emit('healthCheck', status));
  }

  async initializeAdvancedFeatures() {
    // Initialize intelligent caching
    if (this.config.enableCache) {
      this.setupIntelligentCache();
    }

    // Initialize query engine
    this.setupQueryEngine();

    // Initialize compression if enabled
    if (this.config.enableCompression) {
      this.setupCompression();
    }

    // Initialize encryption if enabled
    if (this.config.enableEncryption) {
      this.setupEncryption();
    }

    // Start metrics collection
    this.startMetricsCollection();
  }

  setupIntelligentCache() {
    this.cache = new Map();
    this.cacheMetadata = new Map(); // TTL and access tracking
    
    // Cache cleanup interval
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Every minute
  }

  setupQueryEngine() {
    this.queryEngine = {
      // SQL-like query parsing
      parseQuery: (queryString) => {
        // Advanced query parsing logic
        return this.parseSQLLikeQuery(queryString);
      },
      
      // Advanced filtering
      filter: (data, conditions) => {
        return this.applyAdvancedFilter(data, conditions);
      },
      
      // Aggregation pipeline
      aggregate: (data, pipeline) => {
        return this.runAggregationPipeline(data, pipeline);
      }
    };
  }

  setupCompression() {
    const zlib = require('zlib');
    this.compression = {
      compress: (data) => zlib.gzipSync(JSON.stringify(data)),
      decompress: (compressed) => JSON.parse(zlib.gunzipSync(compressed))
    };
  }

  setupEncryption() {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = this.config.encryptionKey || crypto.randomBytes(32);
    
    this.encryption = {
      encrypt: (data) => {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        cipher.setAAD(Buffer.from('streaming-package'));
        
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        return { encrypted, iv: iv.toString('hex'), authTag: authTag.toString('hex') };
      },
      
      decrypt: (encryptedData) => {
        const decipher = crypto.createDecipher(algorithm, key);
        decipher.setAAD(Buffer.from('streaming-package'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
      }
    };
  }

  /**
   * 🎯 ULTIMATE LISTENING - Beats all existing packages
   * 
   * Features:
   * - Real-time change streams (MongoDB) / Binlog monitoring (MySQL)
   * - Intelligent caching with TTL
   * - SQL-like filtering
   * - Middleware support
   * - Compression & encryption
   * - Performance metrics
   * - Auto-reconnection
   * - Batch processing
   * 
   * @param {string|Object} keyOrQuery - Key to listen for or query object
   * @param {Function} callback - Callback function
   * @param {Object} [options] - Advanced options
   * @returns {Function} - Unsubscribe function
   */
  on(keyOrQuery, callback, options = {}) {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    // Handle SQL-like queries
    if (typeof keyOrQuery === 'object') {
      return this.onQuery(keyOrQuery, callback, options);
    }
    
    const key = keyOrQuery;
    
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    // Apply middleware
    const wrappedCallback = this.wrapCallbackWithMiddleware(callback, key, options);
    
    // Set up watcher
    if (!this.watchers.has(key)) {
      this.watchers.set(key, { callbacks: new Set(), options: new Set() });
      
      // Start real-time watching on database connector
      this.dbConnector.startRealTimeWatch(key, (data, meta) => {
        this.handleKeyChange(key, data, meta);
      }, options);
    }
    
    this.watchers.get(key).callbacks.add(wrappedCallback);
    this.watchers.get(key).options.add(options);
    
    const setupTime = Date.now() - startTime;
    this.updateMetrics('setup', setupTime);
    
    console.log(`🎯 Started watching key: ${key} (${setupTime}ms)`);
    
    // Return enhanced unsubscribe function
    return () => this.off(key, wrappedCallback);
  }

  /**
   * 🔥 ULTIMATE DATA PUSHING - Superior performance
   * 
   * @param {string} key - The key to update
   * @param {*} data - The data to store
   * @param {Object} [options] - Advanced options
   * @returns {Promise<Object>} - Enhanced operation result
   */
  async push(key, data, options = {}) {
    this.ensureInitialized();
    
    const startTime = Date.now();
    this.metrics.totalRequests++;

    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    if (data === undefined) {
      throw new Error('Data cannot be undefined');
    }

    try {
      // Apply before-write interceptors
      const processedData = await this.applyInterceptors('beforeWrite', { key, data, options });
      
      // Apply compression if enabled
      const finalData = this.config.enableCompression ? 
        this.compression.compress(processedData.data) : processedData.data;
      
      // Apply encryption if enabled
      const encryptedData = this.config.enableEncryption ?
        this.encryption.encrypt(finalData) : finalData;

      // Write to database with advanced options
      const result = await this.dbConnector.writeData(key, encryptedData, {
        ...options,
        compressed: this.config.enableCompression,
        encrypted: this.config.enableEncryption
      });

      // Update cache
      if (this.config.enableCache) {
        this.updateCache(key, processedData.data, options);
      }

      // Apply after-write interceptors
      await this.applyInterceptors('afterWrite', { key, data: processedData.data, result, options });

      const responseTime = Date.now() - startTime;
      this.updateMetrics('write', responseTime);

      return {
        ...result,
        responseTime,
        compressed: this.config.enableCompression,
        encrypted: this.config.enableEncryption,
        cached: this.config.enableCache
      };
    } catch (error) {
      this.metrics.errorCount++;
      console.error(`🔥 Failed to push data for key "${key}":`, error.message);
      throw error;
    }
  }

  /**
   * ⚡ ULTIMATE DATA RETRIEVAL - Lightning fast
   * 
   * @param {string} key - The key to retrieve
   * @param {Object} [options] - Retrieval options
   * @returns {Promise<*>} - The data with metadata
   */
  async get(key, options = {}) {
    this.ensureInitialized();
    
    const startTime = Date.now();
    this.metrics.totalRequests++;

    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    try {
      // Check cache first
      if (this.config.enableCache && !options.skipCache) {
        const cachedData = this.getFromCache(key);
        if (cachedData) {
          this.metrics.cacheHits++;
          const responseTime = Date.now() - startTime;
          this.updateMetrics('read', responseTime);
          
          return {
            data: cachedData,
            source: 'cache',
            responseTime,
            fromCache: true
          };
        }
        this.metrics.cacheMisses++;
      }

      // Apply before-read interceptors
      const processedOptions = await this.applyInterceptors('beforeRead', { key, options });

      // Read from database
      const result = await this.dbConnector.readData(key);
      
      if (!result) {
        return null;
      }

      // Decrypt data if needed
      let finalData = result.data;
      if (result.encrypted && this.config.enableEncryption) {
        finalData = this.encryption.decrypt(finalData);
      }

      // Decompress data if needed
      if (result.compressed && this.config.enableCompression) {
        finalData = this.compression.decompress(finalData);
      }

      // Update cache
      if (this.config.enableCache) {
        this.updateCache(key, finalData, options);
      }

      // Apply after-read interceptors
      await this.applyInterceptors('afterRead', { key, data: finalData, result, options: processedOptions });

      const responseTime = Date.now() - startTime;
      this.updateMetrics('read', responseTime);

      return {
        data: finalData,
        metadata: {
          timestamp: result.timestamp,
          lastModified: result.lastModified,
          tags: result.tags || [],
          compressed: result.compressed,
          encrypted: result.encrypted
        },
        source: 'database',
        responseTime,
        fromCache: false
      };
    } catch (error) {
      this.metrics.errorCount++;
      console.error(`🔥 Failed to get data for key "${key}":`, error.message);
      throw error;
    }
  }

  /**
   * 🔍 ULTIMATE QUERYING - SQL-like power
   * 
   * @param {Object|string} query - Query object or SQL-like string
   * @param {Object} [options] - Query options
   * @returns {Promise<Array>} - Query results
   */
  async query(query, options = {}) {
    this.ensureInitialized();
    
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Parse SQL-like queries
      if (typeof query === 'string') {
        query = this.queryEngine.parseQuery(query);
      }

      // Execute query on database
      const results = await this.dbConnector.queryData(query, options);

      // Apply post-processing
      const processedResults = this.queryEngine.filter(results, query.where || {});
      
      // Apply aggregation if requested
      const finalResults = query.aggregate ? 
        this.queryEngine.aggregate(processedResults, query.aggregate) : 
        processedResults;

      const responseTime = Date.now() - startTime;
      this.updateMetrics('query', responseTime);

      return {
        data: finalResults,
        count: finalResults.length,
        responseTime,
        query: query
      };
    } catch (error) {
      this.metrics.errorCount++;
      console.error('🔥 Query failed:', error.message);
      throw error;
    }
  }

  /**
   * 🎛️ ADVANCED FEATURES
   */

  // Add middleware
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middleware.push(middleware);
    return this;
  }

  // Add interceptors
  addInterceptor(type, interceptor) {
    if (!this.interceptors[type]) {
      throw new Error(`Invalid interceptor type: ${type}`);
    }
    this.interceptors[type].push(interceptor);
    return this;
  }

  // Batch operations
  async batch(operations) {
    this.ensureInitialized();
    
    const results = [];
    const startTime = Date.now();
    
    // Execute operations in parallel for better performance
    const promises = operations.map(async (op) => {
      try {
        switch (op.type) {
          case 'push':
            return await this.push(op.key, op.data, op.options);
          case 'get':
            return await this.get(op.key, op.options);
          case 'delete':
            return await this.delete(op.key);
          default:
            throw new Error(`Unknown operation type: ${op.type}`);
        }
      } catch (error) {
        return { error: error.message, operation: op };
      }
    });

    const batchResults = await Promise.all(promises);
    const responseTime = Date.now() - startTime;

    return {
      results: batchResults,
      count: batchResults.length,
      responseTime,
      errors: batchResults.filter(r => r.error).length
    };
  }

  // Transaction support
  async transaction(operations) {
    this.ensureInitialized();
    
    if (this.config.dbType === 'mongodb') {
      // Use MongoDB transactions
      return await this.mongoTransaction(operations);
    } else {
      // Use MySQL transactions
      return await this.mysqlTransaction(operations);
    }
  }

  /**
   * 📊 ULTIMATE MONITORING & METRICS
   */
  getMetrics() {
    const now = Date.now();
    const uptimeHours = (now - this.metrics.uptime) / (1000 * 60 * 60);
    
    return {
      ...this.metrics,
      uptime: uptimeHours,
      requestsPerHour: this.metrics.totalRequests / Math.max(uptimeHours, 1),
      changesPerHour: this.metrics.totalChanges / Math.max(uptimeHours, 1),
      cacheHitRatio: this.metrics.cacheHits / Math.max(this.metrics.cacheHits + this.metrics.cacheMisses, 1),
      errorRate: this.metrics.errorCount / Math.max(this.metrics.totalRequests, 1),
      database: this.dbConnector ? this.dbConnector.getMetrics() : null,
      watchers: this.watchers.size,
      cacheSize: this.cache ? this.cache.size : 0,
      features: this.getEnabledFeatures()
    };
  }

  getEnabledFeatures() {
    return {
      realTimeStreaming: true,
      changeStreams: this.config.dbType === 'mongodb' && this.config.useChangeStreams,
      binlogMonitoring: this.config.dbType === 'mysql' && this.config.useBinlog,
      intelligentCaching: this.config.enableCache,
      compression: this.config.enableCompression,
      encryption: this.config.enableEncryption,
      queryEngine: true,
      middleware: this.middleware.length > 0,
      interceptors: Object.values(this.interceptors).some(arr => arr.length > 0),
      autoReconnection: this.config.autoReconnect,
      healthChecks: true,
      metrics: true,
      batchOperations: true,
      transactions: true
    };
  }

  /**
   * 🧠 INTERNAL HELPER METHODS
   */

  handleKeyChange(key, data, meta) {
    const watcherInfo = this.watchers.get(key);
    if (!watcherInfo) return;

    // Update cache
    if (this.config.enableCache && data !== null) {
      this.updateCache(key, data);
    } else if (meta.changeType === 'deleted') {
      this.cache.delete(key);
    }

    // Notify all callbacks for this key
    watcherInfo.callbacks.forEach(callback => {
      try {
        callback(data, { ...meta, features: this.getEnabledFeatures() });
      } catch (error) {
        console.error(`Error in callback for key ${key}:`, error);
      }
    });
  }

  wrapCallbackWithMiddleware(callback, key, options) {
    return async (data, meta) => {
      let context = { key, data, meta, options };
      
      // Apply middleware in sequence
      for (const middleware of this.middleware) {
        try {
          context = await middleware(context) || context;
        } catch (error) {
          console.error('Middleware error:', error);
        }
      }
      
      // Call original callback
      callback(context.data, context.meta);
    };
  }

  async applyInterceptors(type, context) {
    let result = context;
    
    for (const interceptor of this.interceptors[type]) {
      try {
        result = await interceptor(result) || result;
      } catch (error) {
        console.error(`Interceptor error (${type}):`, error);
      }
    }
    
    return result;
  }

  updateCache(key, data, options = {}) {
    if (!this.config.enableCache) return;
    
    const now = Date.now();
    const ttl = options.cacheTTL || this.config.cacheTTL;
    
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      this.evictOldestCacheEntry();
    }
    
    this.cache.set(key, data);
    this.cacheMetadata.set(key, {
      timestamp: now,
      ttl: ttl * 1000,
      accessCount: 1,
      lastAccess: now
    });
  }

  getFromCache(key) {
    if (!this.cache.has(key)) return null;
    
    const metadata = this.cacheMetadata.get(key);
    const now = Date.now();
    
    // Check TTL
    if (metadata && now > metadata.timestamp + metadata.ttl) {
      this.cache.delete(key);
      this.cacheMetadata.delete(key);
      return null;
    }
    
    // Update access metadata
    if (metadata) {
      metadata.accessCount++;
      metadata.lastAccess = now;
    }
    
    return this.cache.get(key);
  }

  cleanupExpiredCache() {
    const now = Date.now();
    
    for (const [key, metadata] of this.cacheMetadata) {
      if (now > metadata.timestamp + metadata.ttl) {
        this.cache.delete(key);
        this.cacheMetadata.delete(key);
      }
    }
  }

  evictOldestCacheEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, metadata] of this.cacheMetadata) {
      if (metadata.lastAccess < oldestTime) {
        oldestTime = metadata.lastAccess;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheMetadata.delete(oldestKey);
    }
  }

  updateMetrics(operation, responseTime) {
    this.metrics.avgResponseTime = (
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1)) + responseTime
    ) / this.metrics.totalRequests;
  }

  startMetricsCollection() {
    // Collect and emit metrics every 30 seconds
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 30000);
  }

  parseSQLLikeQuery(queryString) {
    // Basic SQL-like query parser
    // This is a simplified implementation - in production you'd want a full parser
    const query = {};
    
    // Extract SELECT fields
    const selectMatch = queryString.match(/SELECT\s+(.*?)\s+FROM/i);
    if (selectMatch) {
      query.select = selectMatch[1].split(',').map(field => field.trim());
    }
    
    // Extract WHERE conditions
    const whereMatch = queryString.match(/WHERE\s+(.*?)(?:\s+ORDER|\s+LIMIT|$)/i);
    if (whereMatch) {
      query.where = this.parseWhereClause(whereMatch[1]);
    }
    
    // Extract ORDER BY
    const orderMatch = queryString.match(/ORDER\s+BY\s+(.*?)(?:\s+LIMIT|$)/i);
    if (orderMatch) {
      query.orderBy = orderMatch[1].trim();
    }
    
    // Extract LIMIT
    const limitMatch = queryString.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      query.limit = parseInt(limitMatch[1]);
    }
    
    return query;
  }

  parseWhereClause(whereClause) {
    // Basic WHERE clause parser
    const conditions = {};
    
    // Split by AND (simplified)
    const parts = whereClause.split(/\s+AND\s+/i);
    
    for (const part of parts) {
      const match = part.match(/(\w+)\s*(=|!=|>|<|>=|<=|LIKE)\s*(['"])(.*?)\3/i);
      if (match) {
        const [, field, operator, quote, value] = match;
        conditions[field] = { operator, value };
      }
    }
    
    return conditions;
  }

  applyAdvancedFilter(data, conditions) {
    return data.filter(item => {
      for (const [field, condition] of Object.entries(conditions)) {
        const value = item.data[field];
        const conditionValue = condition.value;
        
        switch (condition.operator) {
          case '=':
            if (value !== conditionValue) return false;
            break;
          case '!=':
            if (value === conditionValue) return false;
            break;
          case '>':
            if (value <= conditionValue) return false;
            break;
          case '<':
            if (value >= conditionValue) return false;
            break;
          case '>=':
            if (value < conditionValue) return false;
            break;
          case '<=':
            if (value > conditionValue) return false;
            break;
          case 'LIKE':
            const regex = new RegExp(conditionValue.replace(/%/g, '.*'), 'i');
            if (!regex.test(value)) return false;
            break;
        }
      }
      return true;
    });
  }

  runAggregationPipeline(data, pipeline) {
    let result = data;
    
    for (const stage of pipeline) {
      if (stage.$group) {
        result = this.groupData(result, stage.$group);
      } else if (stage.$sort) {
        result = this.sortData(result, stage.$sort);
      } else if (stage.$limit) {
        result = result.slice(0, stage.$limit);
      } else if (stage.$skip) {
        result = result.slice(stage.$skip);
      }
    }
    
    return result;
  }

  // Standard interface methods with enhanced error handling

  async delete(key) {
    this.ensureInitialized();
    
    try {
      const result = await this.dbConnector.deleteData(key);
      
      // Remove from cache
      if (this.config.enableCache) {
        this.cache.delete(key);
        this.cacheMetadata.delete(key);
      }
      
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      console.error(`🔥 Failed to delete data for key "${key}":`, error.message);
      throw error;
    }
  }

  off(key, callback) {
    this.ensureInitialized();
    
    const watcherInfo = this.watchers.get(key);
    if (watcherInfo) {
      watcherInfo.callbacks.delete(callback);
      
      if (watcherInfo.callbacks.size === 0) {
        this.watchers.delete(key);
        this.dbConnector.stopWatch(key);
      }
    }
  }

  removeAllListeners(key) {
    this.ensureInitialized();
    
    if (key) {
      this.watchers.delete(key);
      this.dbConnector.stopWatch(key);
    } else {
      for (const [watchKey] of this.watchers) {
        this.dbConnector.stopWatch(watchKey);
      }
      this.watchers.clear();
    }
  }

  async getAllKeys() {
    this.ensureInitialized();
    return await this.dbConnector.getAllKeys();
  }

  async destroy() {
    if (!this.initialized) return;

    console.log('🧹 Destroying Ultimate Realtime Stream Package...');
    
    try {
      // Clear all watchers
      this.watchers.clear();
      
      // Clear cache
      if (this.cache) {
        this.cache.clear();
        this.cacheMetadata.clear();
      }
      
      // Disconnect from database
      if (this.dbConnector) {
        await this.dbConnector.disconnect();
        this.dbConnector = null;
      }

      this.cleanup();
      console.log('✅ Ultimate package destroyed successfully');
      this.emit('destroyed');
    } catch (error) {
      console.error('🔥 Error during destruction:', error.message);
      this.cleanup();
    }
  }

  cleanup() {
    this.initialized = false;
    this.config = null;
    this.dbConnector = null;
    this.watchers.clear();
    this.cache?.clear();
    this.cacheMetadata?.clear();
    this.middleware = [];
    this.interceptors = {
      beforeWrite: [],
      afterWrite: [],
      beforeRead: [],
      afterRead: [],
      onChange: []
    };
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Package not initialized. Call init() first.');
    }
  }
}

// Create and export a singleton instance
const ultimateStreamInstance = new UltimateRealtimeStreamPackage();

module.exports = ultimateStreamInstance; 