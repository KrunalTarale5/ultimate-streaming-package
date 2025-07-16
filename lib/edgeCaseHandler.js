const EventEmitter = require('events');

class EdgeCaseHandler extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxRetries: config.maxRetries || 10,
      retryDelay: config.retryDelay || 1000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 30000,
      memoryThreshold: config.memoryThreshold || 0.9, // 90% of available memory
      diskSpaceThreshold: config.diskSpaceThreshold || 0.95, // 95% of disk space
      connectionTimeout: config.connectionTimeout || 30000,
      operationTimeout: config.operationTimeout || 10000,
      healthCheckInterval: config.healthCheckInterval || 5000,
      ...config
    };
    
    this.circuitBreakerState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.operationsInProgress = new Map();
    this.retryQueue = [];
    this.healthChecks = new Map();
    this.resourceMonitor = null;
    
    this.setupResourceMonitoring();
  }

  setupResourceMonitoring() {
    this.resourceMonitor = setInterval(() => {
      this.checkSystemResources();
    }, this.config.healthCheckInterval);
  }

  async checkSystemResources() {
    try {
      // Memory usage check
      const memUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const memoryUsagePercent = memUsage.rss / totalMemory;
      
      if (memoryUsagePercent > this.config.memoryThreshold) {
        this.emit('resourceWarning', {
          type: 'memory',
          usage: memoryUsagePercent,
          threshold: this.config.memoryThreshold,
          message: 'High memory usage detected'
        });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      // CPU usage check (simplified)
      const cpuUsage = process.cpuUsage();
      
      // Connection pool monitoring
      this.emit('healthCheck', {
        memory: {
          used: memUsage.rss,
          heap: memUsage.heapUsed,
          percentage: memoryUsagePercent
        },
        cpu: cpuUsage,
        operationsInProgress: this.operationsInProgress.size,
        circuitBreakerState: this.circuitBreakerState,
        failureCount: this.failureCount,
        retryQueueSize: this.retryQueue.length
      });
      
    } catch (error) {
      this.emit('monitoringError', error);
    }
  }

  async executeWithErrorHandling(operation, context = {}) {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    try {
      // Check circuit breaker
      if (this.circuitBreakerState === 'OPEN') {
        if (Date.now() - this.lastFailureTime > this.config.circuitBreakerTimeout) {
          this.circuitBreakerState = 'HALF_OPEN';
          console.log('🔄 Circuit breaker moved to HALF_OPEN state');
        } else {
          throw new Error('Circuit breaker is OPEN - operation rejected');
        }
      }
      
      // Track operation
      this.operationsInProgress.set(operationId, {
        startTime,
        context,
        type: context.type || 'unknown'
      });
      
      // Set operation timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.operationTimeout}ms`));
        }, this.config.operationTimeout);
      });
      
      // Execute operation with timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]);
      
      // Operation succeeded
      this.onOperationSuccess(operationId);
      return result;
      
    } catch (error) {
      return await this.handleOperationFailure(error, operation, context, operationId);
    } finally {
      this.operationsInProgress.delete(operationId);
    }
  }

  async handleOperationFailure(error, operation, context, operationId) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    // Classify error type
    const errorType = this.classifyError(error);
    
    console.error(`💥 Operation failed (${errorType}): ${error.message}`);
    
    // Emit error for monitoring
    this.emit('operationFailed', {
      operationId,
      error,
      errorType,
      context,
      retryAttempt: context.retryAttempt || 0
    });
    
    // Check if circuit breaker should open
    if (this.failureCount >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker();
    }
    
    // Handle different error types
    switch (errorType) {
      case 'CONNECTION_ERROR':
        return await this.handleConnectionError(error, operation, context);
        
      case 'TIMEOUT_ERROR':
        return await this.handleTimeoutError(error, operation, context);
        
      case 'RESOURCE_ERROR':
        return await this.handleResourceError(error, operation, context);
        
      case 'VALIDATION_ERROR':
        // Don't retry validation errors
        throw error;
        
      case 'AUTHENTICATION_ERROR':
        return await this.handleAuthError(error, operation, context);
        
      case 'RATE_LIMIT_ERROR':
        return await this.handleRateLimitError(error, operation, context);
        
      case 'DATA_CORRUPTION_ERROR':
        return await this.handleDataCorruptionError(error, operation, context);
        
      case 'NETWORK_ERROR':
        return await this.handleNetworkError(error, operation, context);
        
      default:
        return await this.handleGenericError(error, operation, context);
    }
  }

  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection') || message.includes('connect')) {
      return 'CONNECTION_ERROR';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT_ERROR';
    }
    if (message.includes('memory') || message.includes('space')) {
      return 'RESOURCE_ERROR';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'VALIDATION_ERROR';
    }
    if (message.includes('auth') || message.includes('permission') || message.includes('unauthorized')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return 'RATE_LIMIT_ERROR';
    }
    if (message.includes('corrupt') || message.includes('checksum')) {
      return 'DATA_CORRUPTION_ERROR';
    }
    if (message.includes('network') || message.includes('host') || message.includes('dns')) {
      return 'NETWORK_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }

  async handleConnectionError(error, operation, context) {
    console.log('🔄 Handling connection error with exponential backoff...');
    
    const retryAttempt = (context.retryAttempt || 0) + 1;
    
    if (retryAttempt > this.config.maxRetries) {
      throw new Error(`Max retries (${this.config.maxRetries}) exceeded for connection error: ${error.message}`);
    }
    
    // Exponential backoff with jitter
    const delay = this.calculateBackoffDelay(retryAttempt);
    console.log(`⏳ Retrying in ${delay}ms (attempt ${retryAttempt}/${this.config.maxRetries})`);
    
    await this.sleep(delay);
    
    return this.executeWithErrorHandling(operation, {
      ...context,
      retryAttempt
    });
  }

  async handleTimeoutError(error, operation, context) {
    console.log('⏰ Handling timeout error...');
    
    const retryAttempt = (context.retryAttempt || 0) + 1;
    
    if (retryAttempt > 3) { // Lower retry count for timeouts
      throw new Error(`Timeout retries exceeded: ${error.message}`);
    }
    
    // Increase timeout for retry
    const newTimeout = this.config.operationTimeout * (1.5 ** retryAttempt);
    console.log(`⏳ Retrying with increased timeout: ${newTimeout}ms`);
    
    await this.sleep(1000 * retryAttempt);
    
    return this.executeWithErrorHandling(operation, {
      ...context,
      retryAttempt,
      timeout: newTimeout
    });
  }

  async handleResourceError(error, operation, context) {
    console.log('💾 Handling resource error...');
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Clear caches if available
    this.emit('resourceCleanup', { type: 'memory' });
    
    // Wait longer before retry
    await this.sleep(5000);
    
    const retryAttempt = (context.retryAttempt || 0) + 1;
    
    if (retryAttempt > 2) {
      throw new Error(`Resource error retries exceeded: ${error.message}`);
    }
    
    return this.executeWithErrorHandling(operation, {
      ...context,
      retryAttempt
    });
  }

  async handleAuthError(error, operation, context) {
    console.log('🔐 Handling authentication error...');
    
    // Emit auth refresh event
    this.emit('authRefreshNeeded', { error, context });
    
    // Wait for potential auth refresh
    await this.sleep(2000);
    
    const retryAttempt = (context.retryAttempt || 0) + 1;
    
    if (retryAttempt > 1) {
      throw new Error(`Authentication error: ${error.message}`);
    }
    
    return this.executeWithErrorHandling(operation, {
      ...context,
      retryAttempt
    });
  }

  async handleRateLimitError(error, operation, context) {
    console.log('🚫 Handling rate limit error...');
    
    // Extract retry-after header if available
    const retryAfter = this.extractRetryAfter(error) || 5000;
    console.log(`⏳ Rate limited - waiting ${retryAfter}ms`);
    
    await this.sleep(retryAfter);
    
    const retryAttempt = (context.retryAttempt || 0) + 1;
    
    if (retryAttempt > 3) {
      throw new Error(`Rate limit retries exceeded: ${error.message}`);
    }
    
    return this.executeWithErrorHandling(operation, {
      ...context,
      retryAttempt
    });
  }

  async handleDataCorruptionError(error, operation, context) {
    console.log('💀 Handling data corruption error...');
    
    // Emit data integrity check event
    this.emit('dataIntegrityIssue', { error, context });
    
    // Don't retry data corruption errors automatically
    throw new Error(`Data corruption detected: ${error.message}`);
  }

  async handleNetworkError(error, operation, context) {
    console.log('🌐 Handling network error...');
    
    const retryAttempt = (context.retryAttempt || 0) + 1;
    
    if (retryAttempt > this.config.maxRetries) {
      throw new Error(`Network error retries exceeded: ${error.message}`);
    }
    
    // Progressive delay for network issues
    const delay = Math.min(this.config.retryDelay * (2 ** retryAttempt), 30000);
    console.log(`🔄 Network retry in ${delay}ms`);
    
    await this.sleep(delay);
    
    return this.executeWithErrorHandling(operation, {
      ...context,
      retryAttempt
    });
  }

  async handleGenericError(error, operation, context) {
    console.log('❓ Handling generic error...');
    
    const retryAttempt = (context.retryAttempt || 0) + 1;
    
    if (retryAttempt > Math.floor(this.config.maxRetries / 2)) {
      throw error;
    }
    
    const delay = this.calculateBackoffDelay(retryAttempt);
    await this.sleep(delay);
    
    return this.executeWithErrorHandling(operation, {
      ...context,
      retryAttempt
    });
  }

  onOperationSuccess(operationId) {
    // Reset failure count on success
    if (this.circuitBreakerState === 'HALF_OPEN') {
      this.circuitBreakerState = 'CLOSED';
      this.failureCount = 0;
      console.log('✅ Circuit breaker closed - operations resumed');
    } else if (this.circuitBreakerState === 'CLOSED' && this.failureCount > 0) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
    
    this.emit('operationSuccess', {
      operationId,
      timestamp: Date.now()
    });
  }

  openCircuitBreaker() {
    this.circuitBreakerState = 'OPEN';
    this.lastFailureTime = Date.now();
    console.log('🚨 Circuit breaker opened due to failures');
    
    this.emit('circuitBreakerOpened', {
      failureCount: this.failureCount,
      timestamp: this.lastFailureTime
    });
  }

  calculateBackoffDelay(attempt) {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * (2 ** (attempt - 1));
    const jitter = Math.random() * 1000; // Add up to 1 second jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  extractRetryAfter(error) {
    // Try to extract retry-after from error or headers
    if (error.response && error.response.headers) {
      const retryAfter = error.response.headers['retry-after'];
      if (retryAfter) {
        return parseInt(retryAfter) * 1000;
      }
    }
    return null;
  }

  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Graceful degradation methods
  async executeWithGracefulDegradation(operation, fallbackOperation, context = {}) {
    try {
      return await this.executeWithErrorHandling(operation, context);
    } catch (error) {
      console.log('🛡️ Primary operation failed, executing fallback...');
      
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error('💥 Fallback operation also failed:', fallbackError.message);
        throw error; // Throw original error
      }
    }
  }

  // Bulk operation handling with partial failure support
  async executeBulkOperations(operations, options = {}) {
    const {
      continueOnError = true,
      maxConcurrency = 10,
      timeout = 30000
    } = options;
    
    const results = [];
    const errors = [];
    const semaphore = new Array(maxConcurrency).fill(null);
    
    const executeOperation = async (operation, index) => {
      try {
        const result = await this.executeWithErrorHandling(
          operation.fn,
          { ...operation.context, bulkIndex: index }
        );
        results[index] = { success: true, result, index };
      } catch (error) {
        errors.push({ error, index, operation: operation.id });
        results[index] = { success: false, error, index };
        
        if (!continueOnError) {
          throw error;
        }
      }
    };
    
    // Execute operations with controlled concurrency
    const chunks = this.chunkArray(operations, maxConcurrency);
    
    for (const chunk of chunks) {
      const promises = chunk.map((operation, localIndex) => {
        const globalIndex = chunks.indexOf(chunk) * maxConcurrency + localIndex;
        return executeOperation(operation, globalIndex);
      });
      
      await Promise.all(promises);
    }
    
    return {
      results,
      errors,
      successCount: results.filter(r => r.success).length,
      errorCount: errors.length,
      totalOperations: operations.length
    };
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Data consistency checks
  async verifyDataConsistency(data, expectedChecksum) {
    const crypto = require('crypto');
    const actualChecksum = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    
    if (expectedChecksum && actualChecksum !== expectedChecksum) {
      throw new Error(`Data consistency check failed. Expected: ${expectedChecksum}, Actual: ${actualChecksum}`);
    }
    
    return actualChecksum;
  }

  // Connection pool health monitoring
  monitorConnectionPool(pool) {
    const checkHealth = () => {
      const stats = {
        total: pool.totalCount || 0,
        idle: pool.idleCount || 0,
        active: (pool.totalCount || 0) - (pool.idleCount || 0),
        waiting: pool.waitingCount || 0
      };
      
      this.emit('connectionPoolStats', stats);
      
      // Check for potential issues
      if (stats.waiting > stats.total * 0.5) {
        this.emit('connectionPoolWarning', {
          type: 'high_wait_queue',
          stats
        });
      }
      
      if (stats.active > stats.total * 0.9) {
        this.emit('connectionPoolWarning', {
          type: 'high_utilization',
          stats
        });
      }
    };
    
    return setInterval(checkHealth, this.config.healthCheckInterval);
  }

  // Cleanup and shutdown
  destroy() {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
    }
    
    // Clear pending operations
    this.operationsInProgress.clear();
    this.retryQueue = [];
    
    this.emit('destroyed');
  }

  getStatus() {
    return {
      circuitBreakerState: this.circuitBreakerState,
      failureCount: this.failureCount,
      operationsInProgress: this.operationsInProgress.size,
      retryQueueSize: this.retryQueue.length,
      lastFailureTime: this.lastFailureTime,
      config: this.config
    };
  }
}

module.exports = EdgeCaseHandler; 