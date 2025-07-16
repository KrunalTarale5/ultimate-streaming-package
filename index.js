const MongoConnector = require('./lib/mongoConnector');
const MySQLConnector = require('./lib/mysqlConnector');
const HeartbeatSystem = require('./lib/heartbeatSystem');

class RealtimeStreamPackage {
  constructor() {
    this.dbConnector = null;
    this.heartbeatSystem = null;
    this.initialized = false;
    this.config = null;
  }

  /**
   * Initialize the streaming package with database configuration
   * @param {Object} config - Configuration object
   * @param {string} config.dbType - Database type: 'mongodb' or 'mysql'
   * @param {string} config.host - Database host
   * @param {number} [config.port] - Database port (optional)
   * @param {string} config.user - Database username
   * @param {string} config.password - Database password
   * @param {string} config.database - Database name
   * @param {number} [config.pollingInterval] - Polling interval in milliseconds (default: 2000)
   * @param {boolean} [config.debug] - Enable debug logging (default: false)
   * @returns {Promise<boolean>} - Success status
   */
  async init(config) {
    if (this.initialized) {
      throw new Error('Package already initialized. Call destroy() first to reinitialize.');
    }

    if (!config || typeof config !== 'object') {
      throw new Error('Configuration object is required');
    }

    const { dbType, host, user, password, database } = config;

    // Validate required fields
    if (!dbType || !host || !user || !password || !database) {
      throw new Error('Required fields: dbType, host, user, password, database');
    }

    if (!['mongodb', 'mysql'].includes(dbType.toLowerCase())) {
      throw new Error('dbType must be either "mongodb" or "mysql"');
    }

    try {
      // Store configuration
      this.config = { ...config };

      // Initialize appropriate database connector
      if (dbType.toLowerCase() === 'mongodb') {
        this.dbConnector = new MongoConnector();
      } else {
        this.dbConnector = new MySQLConnector();
      }

      // Connect to database
      await this.dbConnector.connect(config);

      // Initialize heartbeat system
      this.heartbeatSystem = new HeartbeatSystem(this.dbConnector, {
        pollingInterval: config.pollingInterval || 2000,
        debug: config.debug || false
      });

      this.initialized = true;
      console.log(`Realtime Stream Package initialized with ${dbType.toUpperCase()}`);
      
      return true;
    } catch (error) {
      console.error('Initialization failed:', error.message);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Listen for changes to a specific key
   * @param {string} key - The key to listen for changes
   * @param {Function} callback - Callback function to be called when data changes
   * @returns {Function} - Unsubscribe function
   */
  on(key, callback) {
    this.ensureInitialized();

    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    return this.heartbeatSystem.addListener(key, callback);
  }

  /**
   * Push data to a specific key
   * @param {string} key - The key to update
   * @param {*} data - The data to store (will be JSON serialized)
   * @returns {Promise<Object>} - Operation result
   */
  async push(key, data) {
    this.ensureInitialized();

    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    if (data === undefined) {
      throw new Error('Data cannot be undefined');
    }

    try {
      return await this.dbConnector.writeData(key, data);
    } catch (error) {
      console.error(`Failed to push data for key "${key}":`, error.message);
      throw error;
    }
  }

  /**
   * Get current data for a key without listening for changes
   * @param {string} key - The key to retrieve data for
   * @returns {Promise<*>} - The current data or null if not found
   */
  async get(key) {
    this.ensureInitialized();

    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    try {
      const result = await this.dbConnector.readData(key);
      return result ? result.data : null;
    } catch (error) {
      console.error(`Failed to get data for key "${key}":`, error.message);
      throw error;
    }
  }

  /**
   * Delete data for a specific key
   * @param {string} key - The key to delete
   * @returns {Promise<Object>} - Operation result
   */
  async delete(key) {
    this.ensureInitialized();

    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    try {
      return await this.dbConnector.deleteData(key);
    } catch (error) {
      console.error(`Failed to delete data for key "${key}":`, error.message);
      throw error;
    }
  }

  /**
   * Remove a specific listener for a key
   * @param {string} key - The key to remove listener from
   * @param {Function} callback - The specific callback to remove
   */
  off(key, callback) {
    this.ensureInitialized();

    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    this.heartbeatSystem.removeListener(key, callback);
  }

  /**
   * Remove all listeners for a key (or all keys if key is not provided)
   * @param {string} [key] - The key to remove listeners from (optional)
   */
  removeAllListeners(key) {
    this.ensureInitialized();
    this.heartbeatSystem.removeAllListeners(key);
  }

  /**
   * Set the polling interval
   * @param {number} interval - Polling interval in milliseconds (minimum 100ms)
   */
  setPollingInterval(interval) {
    this.ensureInitialized();
    this.heartbeatSystem.setPollingInterval(interval);
  }

  /**
   * Get current status and statistics
   * @returns {Object} - Status information
   */
  getStatus() {
    if (!this.initialized) {
      return { initialized: false };
    }

    return {
      initialized: this.initialized,
      dbType: this.config.dbType,
      dbConnected: this.dbConnector.isConnected(),
      heartbeat: this.heartbeatSystem.getStatus()
    };
  }

  /**
   * Get all available keys in the database
   * @returns {Promise<Array>} - Array of key objects
   */
  async getAllKeys() {
    this.ensureInitialized();

    try {
      return await this.dbConnector.getAllKeys();
    } catch (error) {
      console.error('Failed to get all keys:', error.message);
      throw error;
    }
  }

  /**
   * Destroy and cleanup the package instance
   */
  async destroy() {
    if (!this.initialized) {
      return;
    }

    console.log('Destroying Realtime Stream Package...');
    
    try {
      // Stop heartbeat system
      if (this.heartbeatSystem) {
        this.heartbeatSystem.destroy();
        this.heartbeatSystem = null;
      }

      // Disconnect from database
      if (this.dbConnector) {
        await this.dbConnector.disconnect();
        this.dbConnector = null;
      }

      this.cleanup();
      console.log('Realtime Stream Package destroyed successfully');
    } catch (error) {
      console.error('Error during cleanup:', error.message);
      this.cleanup();
    }
  }

  /**
   * Internal cleanup method
   * @private
   */
  cleanup() {
    this.initialized = false;
    this.config = null;
    this.dbConnector = null;
    this.heartbeatSystem = null;
  }

  /**
   * Ensure the package is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('Package not initialized. Call init() first.');
    }
  }
}

// Create and export a singleton instance
const streamInstance = new RealtimeStreamPackage();

module.exports = streamInstance; 