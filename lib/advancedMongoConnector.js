const { MongoClient } = require('mongodb');
const EventEmitter = require('events');

class AdvancedMongoConnector extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.db = null;
    this.connected = false;
    this.changeStreams = new Map(); // key -> change stream
    this.activeWatchers = new Map(); // key -> watcher info
    this.connectionPool = null;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.retryDelay = 1000;
    this.config = null;
    this.healthCheckInterval = null;
    this.metrics = {
      changesProcessed: 0,
      reconnections: 0,
      errorsHandled: 0,
      activeStreams: 0
    };
  }

  async connect(config) {
    try {
      this.config = { ...config };
      const { host, port, user, password, database } = config;
      
      // Build connection string with advanced options
      let connectionString;
      if (user && password) {
        connectionString = `mongodb://${user}:${password}@${host}:${port || 27017}/${database}`;
      } else {
        connectionString = `mongodb://${host}:${port || 27017}/${database}`;
      }

      // Advanced connection options for production use
      const clientOptions = {
        maxPoolSize: config.maxPoolSize || 50,
        minPoolSize: config.minPoolSize || 5,
        maxIdleTimeMS: config.maxIdleTimeMS || 30000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        heartbeatFrequencyMS: 10000,
        retryWrites: true,
        retryReads: true,
        readPreference: 'primary',
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority', j: true },
        compressors: ['snappy', 'zlib'],
        zlibCompressionLevel: 6
      };

      this.client = new MongoClient(connectionString, clientOptions);
      await this.client.connect();
      
      this.db = this.client.db(database);
      this.connected = true;
      this.retryCount = 0;

      // Set up connection monitoring
      this.setupConnectionMonitoring();
      
      // Start health checks
      this.startHealthChecks();
      
      console.log('Advanced MongoDB connected successfully with real-time change streams');
      this.emit('connected');
      return true;
    } catch (error) {
      console.error('Advanced MongoDB connection failed:', error.message);
      this.connected = false;
      await this.handleConnectionError(error);
      throw error;
    }
  }

  setupConnectionMonitoring() {
    // Monitor connection events
    this.client.on('serverOpening', () => {
      console.log('MongoDB server connection opening');
    });

    this.client.on('serverClosed', () => {
      console.log('MongoDB server connection closed');
      this.handleDisconnection();
    });

    this.client.on('error', (error) => {
      console.error('MongoDB client error:', error);
      this.metrics.errorsHandled++;
      this.emit('error', error);
    });

    this.client.on('timeout', () => {
      console.warn('MongoDB connection timeout');
      this.handleConnectionError(new Error('Connection timeout'));
    });
  }

  async handleConnectionError(error) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = this.retryDelay * Math.pow(2, this.retryCount - 1); // Exponential backoff
      
      console.log(`Reconnecting to MongoDB (attempt ${this.retryCount}/${this.maxRetries}) in ${delay}ms...`);
      
      setTimeout(async () => {
        try {
          await this.connect(this.config);
          this.metrics.reconnections++;
          this.restoreWatchers();
        } catch (retryError) {
          console.error('Reconnection failed:', retryError.message);
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('maxRetriesReached', error);
    }
  }

  async handleDisconnection() {
    this.connected = false;
    
    // Close all change streams
    for (const [key, stream] of this.changeStreams) {
      try {
        await stream.close();
      } catch (error) {
        console.error(`Error closing change stream for key ${key}:`, error);
      }
    }
    
    this.changeStreams.clear();
    this.emit('disconnected');
  }

  async restoreWatchers() {
    console.log('Restoring watchers after reconnection...');
    
    const watchersToRestore = Array.from(this.activeWatchers.entries());
    this.activeWatchers.clear();
    
    for (const [key, watcherInfo] of watchersToRestore) {
      try {
        await this.startRealTimeWatch(key, watcherInfo.callback, watcherInfo.options);
        console.log(`Restored watcher for key: ${key}`);
      } catch (error) {
        console.error(`Failed to restore watcher for key ${key}:`, error);
      }
    }
  }

  startHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.db.admin().ping();
        this.emit('healthCheck', { status: 'healthy', metrics: this.getMetrics() });
      } catch (error) {
        console.error('Health check failed:', error);
        this.emit('healthCheck', { status: 'unhealthy', error: error.message });
      }
    }, 30000); // Every 30 seconds
  }

  async writeData(key, data, options = {}) {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      const document = {
        key: key,
        data: data,
        timestamp: new Date(),
        lastModified: new Date(),
        ttl: options.ttl ? new Date(Date.now() + options.ttl * 1000) : null,
        tags: options.tags || [],
        metadata: options.metadata || {}
      };

      // Use transactions for consistency
      const session = this.client.startSession();
      let result;
      
      try {
        await session.withTransaction(async () => {
          result = await collection.replaceOne(
            { key: key },
            document,
            { upsert: true, session }
          );
        });
      } finally {
        await session.endSession();
      }

      return {
        success: true,
        key: key,
        upserted: result.upsertedCount > 0,
        modified: result.modifiedCount > 0,
        timestamp: document.timestamp
      };
    } catch (error) {
      console.error('MongoDB write error:', error.message);
      this.metrics.errorsHandled++;
      throw error;
    }
  }

  async readData(key) {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      const result = await collection.findOne(
        { key: key },
        { readPreference: 'primaryPreferred' }
      );
      
      if (!result) return null;

      // Check TTL
      if (result.ttl && new Date() > result.ttl) {
        await this.deleteData(key);
        return null;
      }

      return {
        key: result.key,
        data: result.data,
        timestamp: result.timestamp,
        lastModified: result.lastModified,
        tags: result.tags || [],
        metadata: result.metadata || {}
      };
    } catch (error) {
      console.error('MongoDB read error:', error.message);
      throw error;
    }
  }

  async startRealTimeWatch(key, callback, options = {}) {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      // Store watcher info for reconnection
      this.activeWatchers.set(key, { callback, options });

      const collection = this.db.collection('stream_data');
      
      // Create change stream with advanced options
      const pipeline = [
        {
          $match: {
            'fullDocument.key': key,
            operationType: { $in: ['insert', 'update', 'replace', 'delete'] }
          }
        }
      ];

      const changeStreamOptions = {
        fullDocument: 'updateLookup',
        resumeAfter: options.resumeToken,
        startAtOperationTime: options.startAtOperationTime,
        maxAwaitTimeMS: 1000,
        batchSize: 1
      };

      const changeStream = collection.watch(pipeline, changeStreamOptions);
      this.changeStreams.set(key, changeStream);
      this.metrics.activeStreams++;

      // Handle change events
      changeStream.on('change', (change) => {
        try {
          this.metrics.changesProcessed++;
          const changeType = this.mapOperationType(change.operationType);
          const data = change.fullDocument ? change.fullDocument.data : null;
          
          // Create metadata object
          const meta = {
            key: key,
            changeType: changeType,
            timestamp: new Date(),
            operationType: change.operationType,
            resumeToken: change._id,
            clusterTime: change.clusterTime,
            txnNumber: change.txnNumber,
            lsid: change.lsid
          };

          callback(data, meta);
          this.emit('change', { key, data, meta });
        } catch (error) {
          console.error(`Error processing change for key ${key}:`, error);
          this.emit('error', error);
        }
      });

      // Handle change stream errors
      changeStream.on('error', (error) => {
        console.error(`Change stream error for key ${key}:`, error);
        this.metrics.errorsHandled++;
        
        // Attempt to restart the change stream
        setTimeout(() => {
          this.restartChangeStream(key);
        }, 1000);
      });

      changeStream.on('close', () => {
        console.log(`Change stream closed for key: ${key}`);
        this.changeStreams.delete(key);
        this.metrics.activeStreams--;
      });

      // Get initial data
      const initialData = await this.readData(key);
      if (initialData) {
        const meta = {
          key: key,
          changeType: 'initial',
          timestamp: new Date()
        };
        callback(initialData.data, meta);
      }

      console.log(`Real-time change stream started for key: ${key}`);
      return changeStream;

    } catch (error) {
      console.error(`Failed to start change stream for key ${key}:`, error);
      this.activeWatchers.delete(key);
      throw error;
    }
  }

  async restartChangeStream(key) {
    const watcherInfo = this.activeWatchers.get(key);
    if (!watcherInfo) return;

    try {
      // Close existing stream
      const existingStream = this.changeStreams.get(key);
      if (existingStream) {
        await existingStream.close();
        this.changeStreams.delete(key);
      }

      // Restart with resume token if available
      const options = { ...watcherInfo.options };
      await this.startRealTimeWatch(key, watcherInfo.callback, options);
      
      console.log(`Successfully restarted change stream for key: ${key}`);
    } catch (error) {
      console.error(`Failed to restart change stream for key ${key}:`, error);
    }
  }

  mapOperationType(operationType) {
    switch (operationType) {
      case 'insert':
        return 'created';
      case 'update':
      case 'replace':
        return 'updated';
      case 'delete':
        return 'deleted';
      default:
        return operationType;
    }
  }

  async stopWatch(key) {
    const changeStream = this.changeStreams.get(key);
    if (changeStream) {
      try {
        await changeStream.close();
        this.changeStreams.delete(key);
        this.activeWatchers.delete(key);
        this.metrics.activeStreams--;
        console.log(`Stopped watching key: ${key}`);
      } catch (error) {
        console.error(`Error stopping watch for key ${key}:`, error);
      }
    }
  }

  async queryData(query = {}, options = {}) {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      
      // Build MongoDB query from simplified query object
      const mongoQuery = this.buildMongoQuery(query);
      
      const cursor = collection.find(mongoQuery, {
        limit: options.limit || 1000,
        skip: options.skip || 0,
        sort: options.sort || { lastModified: -1 },
        projection: options.fields ? this.buildProjection(options.fields) : null
      });

      const results = await cursor.toArray();
      
      return results.map(doc => ({
        key: doc.key,
        data: doc.data,
        timestamp: doc.timestamp,
        lastModified: doc.lastModified,
        tags: doc.tags || [],
        metadata: doc.metadata || {}
      }));
    } catch (error) {
      console.error('MongoDB query error:', error.message);
      throw error;
    }
  }

  buildMongoQuery(query) {
    const mongoQuery = {};
    
    if (query.keys) {
      mongoQuery.key = { $in: Array.isArray(query.keys) ? query.keys : [query.keys] };
    }
    
    if (query.keyPattern) {
      mongoQuery.key = { $regex: query.keyPattern, $options: 'i' };
    }
    
    if (query.tags) {
      mongoQuery.tags = { $in: Array.isArray(query.tags) ? query.tags : [query.tags] };
    }
    
    if (query.since) {
      mongoQuery.lastModified = { $gte: new Date(query.since) };
    }
    
    if (query.until) {
      mongoQuery.lastModified = { ...mongoQuery.lastModified, $lte: new Date(query.until) };
    }
    
    if (query.data) {
      for (const [field, value] of Object.entries(query.data)) {
        mongoQuery[`data.${field}`] = value;
      }
    }
    
    return mongoQuery;
  }

  buildProjection(fields) {
    const projection = {};
    for (const field of fields) {
      if (field.startsWith('data.')) {
        projection[field] = 1;
      } else {
        projection[field] = 1;
      }
    }
    return projection;
  }

  async getAllKeys() {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      const results = await collection.find(
        {},
        { 
          projection: { key: 1, lastModified: 1, tags: 1, _id: 0 },
          sort: { lastModified: -1 }
        }
      ).toArray();
      
      return results.map(item => ({
        key: item.key,
        lastModified: item.lastModified,
        tags: item.tags || []
      }));
    } catch (error) {
      console.error('MongoDB getAllKeys error:', error.message);
      throw error;
    }
  }

  async deleteData(key) {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      const result = await collection.deleteOne({ key: key });
      
      return {
        success: true,
        deleted: result.deletedCount > 0
      };
    } catch (error) {
      console.error('MongoDB delete error:', error.message);
      throw error;
    }
  }

  async createIndex(indexSpec, options = {}) {
    try {
      const collection = this.db.collection('stream_data');
      await collection.createIndex(indexSpec, options);
      console.log('Index created successfully:', indexSpec);
    } catch (error) {
      console.error('Index creation error:', error.message);
      throw error;
    }
  }

  async setupOptimizedIndexes() {
    try {
      await this.createIndex({ key: 1 }, { unique: true });
      await this.createIndex({ lastModified: -1 });
      await this.createIndex({ tags: 1 });
      await this.createIndex({ ttl: 1 }, { expireAfterSeconds: 0 });
      await this.createIndex({ 'data.userId': 1 });
      await this.createIndex({ key: 1, lastModified: -1 });
      
      console.log('Optimized indexes created successfully');
    } catch (error) {
      console.error('Index setup error:', error.message);
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      connectedStreams: this.changeStreams.size,
      activeWatchers: this.activeWatchers.size,
      isConnected: this.connected,
      retryCount: this.retryCount
    };
  }

  async disconnect() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close all change streams gracefully
    for (const [key, stream] of this.changeStreams) {
      try {
        await stream.close();
      } catch (error) {
        console.error(`Error closing change stream for key ${key}:`, error);
      }
    }

    this.changeStreams.clear();
    this.activeWatchers.clear();

    if (this.client) {
      await this.client.close();
      this.connected = false;
      console.log('Advanced MongoDB disconnected');
    }
  }

  isConnected() {
    return this.connected && this.client;
  }
}

module.exports = AdvancedMongoConnector; 