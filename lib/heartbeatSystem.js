const EventEmitter = require('events');

class HeartbeatSystem extends EventEmitter {
  constructor(dbConnector, config = {}) {
    super();
    this.dbConnector = dbConnector;
    this.pollingInterval = config.pollingInterval || 2000; // Default 2 seconds
    this.debug = config.debug || false;
    
    // Internal state
    this.isPolling = false;
    this.intervalId = null;
    this.cache = new Map(); // Store last known states
    this.listeners = new Map(); // Store key -> callback mappings
    this.lastPollTime = null;
    
    this.log('HeartbeatSystem initialized');
  }

  log(message) {
    if (this.debug) {
      console.log(`[HeartbeatSystem] ${new Date().toISOString()}: ${message}`);
    }
  }

  // Register a listener for a specific key
  addListener(key, callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }

    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key).add(callback);
    this.log(`Listener added for key: ${key}`);

    // Start polling if not already started
    if (!this.isPolling) {
      this.startPolling();
    }

    // Return unsubscribe function
    return () => this.removeListener(key, callback);
  }

  // Remove a specific listener for a key
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
      
      // Remove the key if no more listeners
      if (this.listeners.get(key).size === 0) {
        this.listeners.delete(key);
        this.cache.delete(key); // Also remove from cache
        this.log(`All listeners removed for key: ${key}`);
      }
    }

    // Stop polling if no more listeners
    if (this.listeners.size === 0) {
      this.stopPolling();
    }
  }

  // Remove all listeners for a key
  removeAllListeners(key) {
    if (key) {
      this.listeners.delete(key);
      this.cache.delete(key);
      this.log(`All listeners removed for key: ${key}`);
    } else {
      this.listeners.clear();
      this.cache.clear();
      this.log('All listeners removed');
    }

    if (this.listeners.size === 0) {
      this.stopPolling();
    }
  }

  // Start the polling mechanism
  startPolling() {
    if (this.isPolling) {
      return;
    }

    if (!this.dbConnector.isConnected()) {
      throw new Error('Database not connected');
    }

    this.isPolling = true;
    this.log(`Starting polling with interval: ${this.pollingInterval}ms`);

    this.intervalId = setInterval(async () => {
      await this.poll();
    }, this.pollingInterval);

    // Initial poll
    this.poll();
  }

  // Stop the polling mechanism
  stopPolling() {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.log('Polling stopped');
  }

  // Main polling function
  async poll() {
    if (!this.dbConnector.isConnected()) {
      this.log('Database disconnected, stopping polling');
      this.stopPolling();
      return;
    }

    const startTime = Date.now();
    this.lastPollTime = new Date();

    try {
      // Get all keys that we're listening to
      const keysToCheck = Array.from(this.listeners.keys());
      
      if (keysToCheck.length === 0) {
        this.log('No keys to check, stopping polling');
        this.stopPolling();
        return;
      }

      // Check each key for changes
      const promises = keysToCheck.map(key => this.checkKeyForChanges(key));
      await Promise.all(promises);

      const duration = Date.now() - startTime;
      this.log(`Poll completed in ${duration}ms, checked ${keysToCheck.length} keys`);

    } catch (error) {
      console.error('Poll error:', error.message);
      this.emit('error', error);
    }
  }

  // Check a specific key for changes
  async checkKeyForChanges(key) {
    try {
      const currentData = await this.dbConnector.readData(key);
      const cachedData = this.cache.get(key);

      // If no current data and no cached data, nothing to do
      if (!currentData && !cachedData) {
        return;
      }

      // If data was deleted
      if (!currentData && cachedData) {
        this.cache.delete(key);
        this.notifyListeners(key, null, 'deleted');
        return;
      }

      // If new data (first time or previously deleted)
      if (currentData && !cachedData) {
        this.cache.set(key, {
          data: currentData.data,
          lastModified: currentData.lastModified
        });
        this.notifyListeners(key, currentData.data, 'created');
        return;
      }

      // Check if data has changed
      if (this.hasDataChanged(cachedData, currentData)) {
        this.cache.set(key, {
          data: currentData.data,
          lastModified: currentData.lastModified
        });
        this.notifyListeners(key, currentData.data, 'updated');
      }

    } catch (error) {
      console.error(`Error checking key ${key}:`, error.message);
    }
  }

  // Check if data has changed
  hasDataChanged(cachedData, currentData) {
    if (!cachedData || !currentData) {
      return false;
    }

    // Compare by lastModified timestamp first
    if (cachedData.lastModified && currentData.lastModified) {
      const cachedTime = new Date(cachedData.lastModified).getTime();
      const currentTime = new Date(currentData.lastModified).getTime();
      
      if (currentTime > cachedTime) {
        return true;
      }
    }

    // Fallback to deep comparison of data
    return JSON.stringify(cachedData.data) !== JSON.stringify(currentData.data);
  }

  // Notify all listeners for a key
  notifyListeners(key, data, changeType) {
    const callbacks = this.listeners.get(key);
    if (!callbacks || callbacks.size === 0) {
      return;
    }

    this.log(`Notifying ${callbacks.size} listeners for key: ${key} (${changeType})`);

    callbacks.forEach(callback => {
      try {
        callback(data, {
          key: key,
          changeType: changeType,
          timestamp: new Date()
        });
      } catch (error) {
        console.error(`Error in listener callback for key ${key}:`, error.message);
      }
    });
  }

  // Set polling interval
  setPollingInterval(interval) {
    if (typeof interval !== 'number' || interval < 100) {
      throw new Error('Polling interval must be a number >= 100ms');
    }

    this.pollingInterval = interval;
    this.log(`Polling interval set to: ${interval}ms`);

    // Restart polling with new interval if currently polling
    if (this.isPolling) {
      this.stopPolling();
      this.startPolling();
    }
  }

  // Get current status
  getStatus() {
    return {
      isPolling: this.isPolling,
      pollingInterval: this.pollingInterval,
      listenerCount: this.listeners.size,
      cacheSize: this.cache.size,
      lastPollTime: this.lastPollTime,
      watchedKeys: Array.from(this.listeners.keys())
    };
  }

  // Cleanup
  destroy() {
    this.stopPolling();
    this.removeAllListeners();
    this.removeAllListeners(); // EventEmitter listeners
    this.log('HeartbeatSystem destroyed');
  }
}

module.exports = HeartbeatSystem; 