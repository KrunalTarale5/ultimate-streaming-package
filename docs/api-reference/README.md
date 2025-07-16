# API Reference - Ultimate Streaming Package

## Table of Contents

- [Constructor](#constructor)
- [Configuration](#configuration)
- [Core Methods](#core-methods)
- [Event Handling](#event-handling)
- [Data Operations](#data-operations)
- [Query Methods](#query-methods)
- [Advanced Features](#advanced-features)
- [Error Handling](#error-handling)
- [Type Definitions](#type-definitions)

## Constructor

### `new RealtimeStreamPackage()`

Creates a new instance of the Ultimate Streaming Package.

```javascript
const RealtimeStreamPackage = require('realtime-stream-package');
const streamer = new RealtimeStreamPackage();
```

**Returns**: `RealtimeStreamPackage` - A new streaming package instance

---

## Configuration

### `streamer.init(config)`

Initializes the streaming package with database configuration.

**Parameters**:
- `config` (Object) - Configuration object

**Config Properties**:
| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `dbType` | `'mongodb' \| 'mysql'` | ✅ | Database type |
| `host` | `string` | ✅ | Database host |
| `port` | `number` | ❌ | Database port (default: 27017 for MongoDB, 3306 for MySQL) |
| `user` | `string` | ✅ | Database username |
| `password` | `string` | ✅ | Database password |
| `database` | `string` | ✅ | Database name |
| `pollingInterval` | `number` | ❌ | Polling interval in ms (default: 2000) |
| `debug` | `boolean` | ❌ | Enable debug logging (default: false) |

**Returns**: `Promise<boolean>` - Success status

**Example**:
```javascript
await streamer.init({
  dbType: 'mongodb',
  host: 'localhost',
  port: 27017,
  user: 'admin',
  password: 'password123',
  database: 'myapp',
  pollingInterval: 1000,
  debug: true
});
```

**Throws**:
- `Error` - If package is already initialized
- `Error` - If configuration is invalid
- `Error` - If database connection fails

---

## Core Methods

### `streamer.start()`

Starts monitoring for real-time changes.

**Returns**: `Promise<void>`

**Example**:
```javascript
await streamer.start();
console.log('✅ Real-time monitoring started');
```

**Throws**:
- `Error` - If package is not initialized
- `Error` - If already started

### `streamer.stop()`

Stops monitoring for real-time changes.

**Returns**: `Promise<void>`

**Example**:
```javascript
await streamer.stop();
console.log('⏹️ Monitoring stopped');
```

### `streamer.destroy()`

Completely destroys the streaming package and cleans up all resources.

**Returns**: `Promise<void>`

**Example**:
```javascript
await streamer.destroy();
console.log('🧹 Resources cleaned up');
```

### `streamer.isConnected()`

Checks if the package is connected to the database.

**Returns**: `boolean` - Connection status

**Example**:
```javascript
if (streamer.isConnected()) {
  console.log('📡 Connected to database');
} else {
  console.log('❌ Not connected');
}
```

### `streamer.getStats()`

Returns performance and health statistics.

**Returns**: `Object` - Statistics object

**Statistics Properties**:
```javascript
{
  connections: {
    active: number,
    failed: number,
    reconnects: number
  },
  operations: {
    reads: number,
    writes: number,
    deletes: number,
    queries: number
  },
  performance: {
    avgLatency: number,
    p95Latency: number,
    p99Latency: number
  },
  cache: {
    hitRatio: number,
    hitCount: number,
    missCount: number
  },
  uptime: number
}
```

**Example**:
```javascript
const stats = streamer.getStats();
console.log(`Cache hit ratio: ${stats.cache.hitRatio}%`);
console.log(`Average latency: ${stats.performance.avgLatency}ms`);
```

---

## Event Handling

### `streamer.on(collection, callback, options?)`

Registers an event listener for changes in a specific collection.

**Parameters**:
- `collection` (string) - Collection/table name to monitor
- `callback` (Function) - Callback function for changes
- `options` (Object, optional) - Listener options

**Callback Signature**:
```javascript
(data: any, meta: ChangeMetadata) => void
```

**ChangeMetadata Properties**:
```javascript
{
  key: string,              // Document/record key
  changeType: 'created' | 'updated' | 'deleted',
  timestamp: Date,          // When the change occurred
  collection: string        // Collection name
}
```

**Options Properties**:
| Property | Type | Description |
|----------|------|-------------|
| `filter` | `Object` | MongoDB-style filter for changes |
| `fields` | `string[]` | Only receive specific fields |
| `debounce` | `number` | Debounce changes in milliseconds |

**Returns**: `UnsubscribeFunction` - Function to remove the listener

**Examples**:

**Basic Usage**:
```javascript
const unsubscribe = streamer.on('users', (data, meta) => {
  console.log('User changed:', data);
  console.log('Change type:', meta.changeType);
  console.log('Timestamp:', meta.timestamp);
});

// Later, remove the listener
unsubscribe();
```

**With Filtering**:
```javascript
streamer.on('products', (product, meta) => {
  console.log('Premium product updated:', product);
}, {
  filter: { category: 'premium' },
  fields: ['name', 'price', 'stock']
});
```

**With Debouncing**:
```javascript
streamer.on('analytics', (data, meta) => {
  updateDashboard(data);
}, {
  debounce: 500 // Wait 500ms before processing
});
```

### `streamer.onBatch(collection, callback, options)`

Registers a batch event listener for high-frequency changes.

**Parameters**:
- `collection` (string) - Collection/table name
- `callback` (Function) - Batch callback function
- `options` (Object) - Batch options

**Batch Callback Signature**:
```javascript
(changes: Array<{data: any, meta: ChangeMetadata}>) => void
```

**Batch Options**:
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `batchSize` | `number` | 50 | Maximum batch size |
| `batchTimeout` | `number` | 1000 | Maximum wait time (ms) |

**Returns**: `UnsubscribeFunction`

**Example**:
```javascript
streamer.onBatch('orders', (changes) => {
  console.log(`Processing ${changes.length} order changes`);
  
  changes.forEach(({ data, meta }) => {
    processOrder(data, meta);
  });
}, {
  batchSize: 100,
  batchTimeout: 2000
});
```

### `streamer.off(collection, callback?)`

Removes event listeners for a collection.

**Parameters**:
- `collection` (string) - Collection name
- `callback` (Function, optional) - Specific callback to remove

**Returns**: `void`

**Examples**:
```javascript
// Remove specific listener
streamer.off('users', myCallback);

// Remove all listeners for collection
streamer.off('users');
```

### Global Event Listeners

The package emits global events for monitoring:

```javascript
// Connection events
streamer.on('connected', () => {
  console.log('✅ Connected to database');
});

streamer.on('disconnected', () => {
  console.log('❌ Disconnected from database');
});

streamer.on('reconnecting', (attempt) => {
  console.log(`🔄 Reconnecting... Attempt ${attempt}`);
});

streamer.on('reconnected', () => {
  console.log('✅ Reconnected successfully');
});

// Error events
streamer.on('error', (error) => {
  console.error('💥 Streaming error:', error);
});

// Performance events
streamer.on('performance', (metrics) => {
  console.log('📊 Performance metrics:', metrics);
});
```

---

## Data Operations

### `streamer.read(collection, key)`

Reads a single document/record from the database with caching.

**Parameters**:
- `collection` (string) - Collection/table name
- `key` (string) - Document/record key

**Returns**: `Promise<any | null>` - The document/record or null if not found

**Example**:
```javascript
const user = await streamer.read('users', 'user123');
if (user) {
  console.log('User found:', user);
} else {
  console.log('User not found');
}
```

### `streamer.write(collection, key, data)`

Writes (creates or updates) a document/record.

**Parameters**:
- `collection` (string) - Collection/table name
- `key` (string) - Document/record key
- `data` (Object) - Data to write

**Returns**: `Promise<WriteResult>`

**WriteResult Properties**:
```javascript
{
  success: boolean,
  key: string,
  upserted: boolean,    // true if created, false if updated
  modified: boolean     // true if data was actually changed
}
```

**Example**:
```javascript
const result = await streamer.write('users', 'user123', {
  name: 'John Doe',
  email: 'john@example.com',
  lastLogin: new Date()
});

console.log('Write result:', result);
// { success: true, key: 'user123', upserted: false, modified: true }
```

### `streamer.delete(collection, key)`

Deletes a document/record.

**Parameters**:
- `collection` (string) - Collection/table name
- `key` (string) - Document/record key

**Returns**: `Promise<DeleteResult>`

**DeleteResult Properties**:
```javascript
{
  success: boolean,
  key: string,
  deleted: boolean      // true if document existed and was deleted
}
```

**Example**:
```javascript
const result = await streamer.delete('users', 'user123');
console.log('Delete result:', result);
// { success: true, key: 'user123', deleted: true }
```

### `streamer.bulkWrite(collection, operations)`

Performs multiple write operations in a single batch.

**Parameters**:
- `collection` (string) - Collection/table name
- `operations` (Array) - Array of write operations

**Operation Format**:
```javascript
{
  key: string,
  data: Object
}
```

**Returns**: `Promise<BulkWriteResult>`

**Example**:
```javascript
const operations = [
  { key: 'user1', data: { name: 'Alice', status: 'active' } },
  { key: 'user2', data: { name: 'Bob', status: 'inactive' } },
  { key: 'user3', data: { name: 'Charlie', status: 'active' } }
];

const result = await streamer.bulkWrite('users', operations);
console.log(`Processed ${result.success} operations`);
```

---

## Query Methods

### `streamer.query(collection, options)`

Queries multiple documents/records with advanced filtering and caching.

**Parameters**:
- `collection` (string) - Collection/table name
- `options` (Object) - Query options

**Query Options**:
| Property | Type | Description |
|----------|------|-------------|
| `filter` | `Object` | MongoDB-style filter |
| `sort` | `Object` | Sort specification |
| `limit` | `number` | Maximum results |
| `skip` | `number` | Number of results to skip |
| `fields` | `string[]` | Fields to include |
| `cache` | `boolean` | Enable query caching (default: true) |
| `cacheTtl` | `number` | Cache TTL in milliseconds |

**Returns**: `Promise<any[]>` - Array of matching documents

**Examples**:

**Basic Query**:
```javascript
const activeUsers = await streamer.query('users', {
  filter: { status: 'active' },
  sort: { lastLogin: -1 },
  limit: 100
});
```

**Advanced Query**:
```javascript
const premiumProducts = await streamer.query('products', {
  filter: {
    category: 'premium',
    price: { $gte: 100, $lte: 1000 },
    inStock: true
  },
  sort: { popularity: -1, price: 1 },
  limit: 50,
  fields: ['name', 'price', 'description', 'images'],
  cacheTtl: 60000 // Cache for 1 minute
});
```

### `streamer.count(collection, filter?)`

Counts documents/records matching a filter.

**Parameters**:
- `collection` (string) - Collection/table name
- `filter` (Object, optional) - Filter criteria

**Returns**: `Promise<number>` - Count of matching documents

**Example**:
```javascript
const totalUsers = await streamer.count('users');
const activeUsers = await streamer.count('users', { status: 'active' });

console.log(`${activeUsers} of ${totalUsers} users are active`);
```

### `streamer.aggregate(collection, pipeline)`

Performs aggregation operations (MongoDB only).

**Parameters**:
- `collection` (string) - Collection name
- `pipeline` (Array) - Aggregation pipeline

**Returns**: `Promise<any[]>` - Aggregation results

**Example**:
```javascript
const salesStats = await streamer.aggregate('orders', [
  { $match: { status: 'completed' } },
  { $group: {
    _id: '$customerId',
    totalSpent: { $sum: '$amount' },
    orderCount: { $sum: 1 }
  }},
  { $sort: { totalSpent: -1 } },
  { $limit: 10 }
]);
```

---

## Advanced Features

### Cache Management

#### `streamer.clearCache(pattern?)`

Clears cache entries matching a pattern.

**Parameters**:
- `pattern` (string, optional) - Pattern to match (supports wildcards)

**Returns**: `Promise<number>` - Number of cleared entries

**Examples**:
```javascript
// Clear all cache
await streamer.clearCache();

// Clear cache for specific collection
await streamer.clearCache('users:*');

// Clear cache for specific query
await streamer.clearCache('products:query:*');
```

#### `streamer.getCacheStats()`

Returns cache performance statistics.

**Returns**: `Object` - Cache statistics

```javascript
const cacheStats = streamer.getCacheStats();
console.log(`Cache hit ratio: ${cacheStats.hitRatio}%`);
console.log(`Cache size: ${cacheStats.size} entries`);
```

### Health Monitoring

#### `streamer.healthCheck()`

Performs a comprehensive health check.

**Returns**: `Promise<HealthStatus>`

**HealthStatus Properties**:
```javascript
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  checks: {
    database: 'pass' | 'fail',
    cache: 'pass' | 'fail',
    memory: 'pass' | 'fail',
    latency: 'pass' | 'fail'
  },
  metrics: {
    responseTime: number,
    memoryUsage: number,
    cacheHitRatio: number,
    activeConnections: number
  }
}
```

**Example**:
```javascript
const health = await streamer.healthCheck();
if (health.status !== 'healthy') {
  console.warn('Health check failed:', health.checks);
}
```

### Performance Monitoring

#### `streamer.enableMetrics(options?)`

Enables detailed performance metrics collection.

**Parameters**:
- `options` (Object, optional) - Metrics options

**Options**:
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `interval` | `number` | 10000 | Metrics collection interval (ms) |
| `detailed` | `boolean` | false | Enable detailed metrics |

**Example**:
```javascript
streamer.enableMetrics({
  interval: 5000,
  detailed: true
});

streamer.on('metrics', (metrics) => {
  console.log('Performance metrics:', metrics);
});
```

---

## Error Handling

### Error Types

The package throws specific error types for different scenarios:

#### `ConnectionError`
Thrown when database connection issues occur.

```javascript
try {
  await streamer.init(config);
} catch (error) {
  if (error.name === 'ConnectionError') {
    console.error('Database connection failed:', error.message);
  }
}
```

#### `ValidationError`
Thrown when invalid parameters are provided.

```javascript
try {
  await streamer.write('users', '', {}); // Invalid key
} catch (error) {
  if (error.name === 'ValidationError') {
    console.error('Invalid parameters:', error.message);
  }
}
```

#### `StreamingError`
Thrown when streaming operations fail.

```javascript
streamer.on('error', (error) => {
  if (error.name === 'StreamingError') {
    console.error('Streaming error:', error.message);
    // Implement recovery logic
  }
});
```

### Error Recovery

The package provides automatic error recovery for many scenarios:

```javascript
// Configure retry behavior
await streamer.init({
  // ... other config
  retries: 5,
  retryDelay: 1000,
  maxRetryDelay: 30000
});
```

---

## Type Definitions

### TypeScript Support

The package includes comprehensive TypeScript definitions:

```typescript
import { RealtimeStreamPackage, StreamConfig, ChangeMetadata } from 'realtime-stream-package';

const streamer = new RealtimeStreamPackage();

const config: StreamConfig = {
  dbType: 'mongodb',
  host: 'localhost',
  user: 'admin',
  password: 'password',
  database: 'myapp'
};

await streamer.init(config);

streamer.on('users', (data: any, meta: ChangeMetadata) => {
  console.log('User updated:', data);
});
```

### Interface Definitions

#### `StreamConfig`
```typescript
interface StreamConfig {
  dbType: 'mongodb' | 'mysql';
  host: string;
  port?: number;
  user: string;
  password: string;
  database: string;
  pollingInterval?: number;
  debug?: boolean;
}
```

#### `ChangeMetadata`
```typescript
interface ChangeMetadata {
  key: string;
  changeType: 'created' | 'updated' | 'deleted';
  timestamp: Date;
  collection: string;
}
```

#### `WriteResult`
```typescript
interface WriteResult {
  success: boolean;
  key: string;
  upserted: boolean;
  modified: boolean;
}
```

#### `DeleteResult`
```typescript
interface DeleteResult {
  success: boolean;
  key: string;
  deleted: boolean;
}
```

---

## Examples

### Complete Integration Example

```javascript
const RealtimeStreamPackage = require('realtime-stream-package');

async function setupRealTimeApp() {
  const streamer = new RealtimeStreamPackage();
  
  // Initialize with MongoDB
  await streamer.init({
    dbType: 'mongodb',
    host: 'localhost',
    port: 27017,
    user: 'admin',
    password: 'password',
    database: 'myapp',
    debug: true
  });
  
  // Listen for user changes
  streamer.on('users', (user, meta) => {
    console.log(`User ${meta.changeType}:`, user);
    
    // Update UI, send notifications, etc.
    updateUserUI(user, meta);
  });
  
  // Listen for order changes with filtering
  streamer.on('orders', (order, meta) => {
    if (meta.changeType === 'created') {
      sendNewOrderNotification(order);
    }
  }, {
    filter: { status: 'pending' }
  });
  
  // Batch process high-frequency analytics
  streamer.onBatch('analytics', (events) => {
    processAnalyticsBatch(events);
  }, {
    batchSize: 100,
    batchTimeout: 5000
  });
  
  // Handle errors
  streamer.on('error', (error) => {
    console.error('Streaming error:', error);
    // Implement error recovery
  });
  
  // Monitor performance
  streamer.enableMetrics();
  streamer.on('metrics', (metrics) => {
    if (metrics.performance.avgLatency > 100) {
      console.warn('High latency detected:', metrics);
    }
  });
  
  // Start streaming
  await streamer.start();
  console.log('✅ Real-time streaming started');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await streamer.stop();
    await streamer.destroy();
    process.exit(0);
  });
}

setupRealTimeApp().catch(console.error);
```

---

## Support

- **Documentation**: Full documentation available at [docs link]
- **Examples**: Complete examples in the [examples repository]
- **Issues**: Report issues on [GitHub Issues]
- **Discord**: Join our [Discord community]
- **Email**: Enterprise support at support@ultimate-streaming.com

---

*API Reference v2.0.0 - Last updated: $(date)* 