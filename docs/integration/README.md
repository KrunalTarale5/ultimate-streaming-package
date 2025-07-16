# Integration Guide - Ultimate Streaming Package

## 🚀 Quick Start Integration

Get your real-time streaming up and running in just **5 minutes**!

### Step 1: Installation

```bash
npm install realtime-stream-package
```

### Step 2: Basic Setup

```javascript
const RealtimeStreamPackage = require('realtime-stream-package');

// Initialize the package
const streamer = new RealtimeStreamPackage();

// Configure your database connection
const config = {
  dbType: 'mongodb', // or 'mysql'
  host: 'localhost',
  port: 27017,
  user: 'your_username',
  password: 'your_password',
  database: 'your_database',
  pollingInterval: 1000, // Optional: polling interval in ms
  debug: true // Optional: enable debug logging
};

// Initialize connection
await streamer.init(config);
```

### Step 3: Start Listening for Changes

```javascript
// Listen for real-time data changes
streamer.on('users', (data, meta) => {
  console.log('User data changed:', data);
  console.log('Change type:', meta.changeType); // 'created', 'updated', 'deleted'
  console.log('Timestamp:', meta.timestamp);
});

// Start monitoring
await streamer.start();
```

**🎉 That's it!** You now have real-time data streaming in your application.

---

## 📋 Complete Integration Walkthrough

### Prerequisites

- **Node.js** 14.0.0 or higher
- **Database**: MongoDB 4.0+ or MySQL 5.7+
- **Network**: Stable internet connection for real-time features

### Installation Options

#### NPM (Recommended)
```bash
npm install realtime-stream-package
```

#### Yarn
```bash
yarn add realtime-stream-package
```

#### CDN (Browser)
```html
<script src="https://unpkg.com/realtime-stream-package@latest/dist/bundle.js"></script>
```

### Configuration Options

#### MongoDB Configuration
```javascript
const mongoConfig = {
  dbType: 'mongodb',
  host: 'localhost', // or your MongoDB URL
  port: 27017,
  user: 'admin',
  password: 'password123',
  database: 'myapp',
  
  // Advanced MongoDB options
  replicaSet: 'rs0', // For replica sets
  authSource: 'admin', // Authentication database
  ssl: true, // Enable SSL
  retryWrites: true,
  w: 'majority'
};
```

#### MySQL Configuration
```javascript
const mysqlConfig = {
  dbType: 'mysql',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password123',
  database: 'myapp',
  
  // Advanced MySQL options
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};
```

### Advanced Features

#### 1. Custom Event Handling

```javascript
// Multiple event listeners
streamer.on('orders', (data, meta) => {
  if (meta.changeType === 'created') {
    // Handle new order
    handleNewOrder(data);
  } else if (meta.changeType === 'updated') {
    // Handle order update
    handleOrderUpdate(data);
  }
});

streamer.on('inventory', (data, meta) => {
  // Handle inventory changes
  updateInventoryUI(data);
});

// Global error handling
streamer.on('error', (error) => {
  console.error('Streaming error:', error);
  // Implement your error handling logic
});
```

#### 2. Filtering and Conditions

```javascript
// Listen only for specific conditions
streamer.on('products', (data, meta) => {
  // Only handle products with low stock
  if (data.stock < 10) {
    sendLowStockAlert(data);
  }
}, {
  filter: { category: 'electronics' }, // MongoDB-style filter
  fields: ['name', 'stock', 'price'] // Only receive specific fields
});
```

#### 3. Batch Operations

```javascript
// Handle multiple changes at once
streamer.onBatch('orders', (changes) => {
  console.log(`Received ${changes.length} order changes`);
  
  changes.forEach(({ data, meta }) => {
    processOrder(data, meta);
  });
}, {
  batchSize: 50, // Process in batches of 50
  batchTimeout: 5000 // Or every 5 seconds
});
```

### Writing Data

#### Create/Update Operations
```javascript
// Write data (upsert)
const result = await streamer.write('users', 'user123', {
  name: 'John Doe',
  email: 'john@example.com',
  lastLogin: new Date()
});

console.log('Write result:', result);
// { success: true, key: 'user123', upserted: true, modified: false }
```

#### Delete Operations
```javascript
// Delete data
const deleteResult = await streamer.delete('users', 'user123');
console.log('Delete result:', deleteResult);
// { success: true, key: 'user123', deleted: true }
```

#### Bulk Operations
```javascript
// Bulk write operations
const bulkData = [
  { key: 'user1', data: { name: 'Alice' } },
  { key: 'user2', data: { name: 'Bob' } },
  { key: 'user3', data: { name: 'Charlie' } }
];

const bulkResult = await streamer.bulkWrite('users', bulkData);
console.log('Bulk result:', bulkResult);
```

### Query Operations

#### Basic Queries
```javascript
// Read single record
const user = await streamer.read('users', 'user123');
console.log('User data:', user);

// Query multiple records
const activeUsers = await streamer.query('users', {
  filter: { status: 'active' },
  limit: 100,
  sort: { lastLogin: -1 }
});
```

#### Advanced Queries
```javascript
// Complex queries with aggregation
const stats = await streamer.aggregate('orders', [
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

### Error Handling

#### Connection Management
```javascript
// Handle connection events
streamer.on('connected', () => {
  console.log('✅ Connected to database');
});

streamer.on('disconnected', () => {
  console.log('❌ Disconnected from database');
});

streamer.on('reconnecting', (attempt) => {
  console.log(`🔄 Reconnecting... Attempt ${attempt}`);
});

streamer.on('error', (error) => {
  console.error('💥 Streaming error:', error);
  
  // Implement custom error handling
  if (error.code === 'CONNECTION_LOST') {
    // Handle connection loss
    handleConnectionLoss();
  } else if (error.code === 'PERMISSION_DENIED') {
    // Handle permission errors
    handlePermissionError();
  }
});
```

#### Graceful Shutdown
```javascript
// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  
  // Stop monitoring
  await streamer.stop();
  
  // Destroy connections
  await streamer.destroy();
  
  process.exit(0);
});
```

## 🏗️ Integration Patterns

### 1. Express.js Integration

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const RealtimeStreamPackage = require('realtime-stream-package');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize streaming
const streamer = new RealtimeStreamPackage();
await streamer.init(config);

// Forward database changes to WebSocket clients
streamer.on('orders', (data, meta) => {
  io.emit('order_update', { data, meta });
});

streamer.on('inventory', (data, meta) => {
  io.emit('inventory_update', { data, meta });
});

// Start monitoring
await streamer.start();

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 2. React Integration

```jsx
import { useEffect, useState } from 'react';
const RealtimeStreamPackage = require('realtime-stream-package');

function useRealtimeData(collection) {
  const [data, setData] = useState([]);
  const [streamer] = useState(() => new RealtimeStreamPackage());

  useEffect(() => {
    const initStreaming = async () => {
      await streamer.init(config);
      
      streamer.on(collection, (newData, meta) => {
        setData(prevData => {
          if (meta.changeType === 'created') {
            return [...prevData, newData];
          } else if (meta.changeType === 'updated') {
            return prevData.map(item => 
              item._id === newData._id ? newData : item
            );
          } else if (meta.changeType === 'deleted') {
            return prevData.filter(item => item._id !== newData._id);
          }
          return prevData;
        });
      });
      
      await streamer.start();
    };

    initStreaming();

    return () => {
      streamer.destroy();
    };
  }, [collection]);

  return data;
}

// Usage in component
function OrdersList() {
  const orders = useRealtimeData('orders');

  return (
    <div>
      {orders.map(order => (
        <div key={order._id}>
          Order #{order._id} - Status: {order.status}
        </div>
      ))}
    </div>
  );
}
```

### 3. Next.js API Routes

```javascript
// pages/api/realtime.js
import { NextApiRequest, NextApiResponse } from 'next';
const RealtimeStreamPackage = require('realtime-stream-package');

let streamer = null;

export default async function handler(req, res) {
  if (!streamer) {
    streamer = new RealtimeStreamPackage();
    await streamer.init(config);
    await streamer.start();
  }

  if (req.method === 'POST') {
    const { collection, key, data } = req.body;
    const result = await streamer.write(collection, key, data);
    res.json(result);
  } else if (req.method === 'GET') {
    const { collection, key } = req.query;
    const data = await streamer.read(collection, key);
    res.json(data);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

## 🔧 Configuration Examples

### Development Environment
```javascript
const devConfig = {
  dbType: 'mongodb',
  host: 'localhost',
  port: 27017,
  user: 'dev_user',
  password: 'dev_password',
  database: 'myapp_dev',
  pollingInterval: 2000,
  debug: true,
  retries: 3
};
```

### Production Environment
```javascript
const prodConfig = {
  dbType: 'mongodb',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  pollingInterval: 500, // Faster polling for production
  debug: false,
  retries: 10,
  ssl: true,
  authSource: 'admin'
};
```

### Environment Variables
```bash
# .env file
DB_HOST=your-mongodb-cluster.mongodb.net
DB_PORT=27017
DB_USER=your_username
DB_PASSWORD=your_secure_password
DB_NAME=production_db
STREAMING_DEBUG=false
STREAMING_POLLING_INTERVAL=500
```

## 🧪 Testing Integration

### Unit Tests
```javascript
const RealtimeStreamPackage = require('realtime-stream-package');

describe('Realtime Streaming', () => {
  let streamer;

  beforeEach(async () => {
    streamer = new RealtimeStreamPackage();
    await streamer.init(testConfig);
  });

  afterEach(async () => {
    await streamer.destroy();
  });

  test('should receive real-time updates', async () => {
    const updates = [];
    
    streamer.on('test_collection', (data, meta) => {
      updates.push({ data, meta });
    });

    await streamer.start();
    
    // Write test data
    await streamer.write('test_collection', 'test1', { name: 'test' });
    
    // Wait for update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(updates).toHaveLength(1);
    expect(updates[0].data.name).toBe('test');
  });
});
```

## 🚨 Common Issues & Solutions

### Issue 1: Connection Timeouts
**Problem**: Connection timeouts in production
**Solution**:
```javascript
const config = {
  // ... other config
  connectionTimeout: 30000,
  serverSelectionTimeout: 30000,
  heartbeatFrequencyMS: 10000
};
```

### Issue 2: Memory Leaks
**Problem**: Memory usage increasing over time
**Solution**:
```javascript
// Properly remove event listeners
const unsubscribe = streamer.on('collection', handler);

// Later, remove the listener
unsubscribe();

// Or remove all listeners for a collection
streamer.off('collection');
```

### Issue 3: High CPU Usage
**Problem**: High CPU usage with frequent updates
**Solution**:
```javascript
// Use batch processing
streamer.onBatch('high_frequency_collection', (changes) => {
  // Process all changes at once
  processBatch(changes);
}, {
  batchSize: 100,
  batchTimeout: 1000
});
```

## 📚 Next Steps

1. **[API Reference](../api-reference/README.md)** - Detailed API documentation
2. **[Best Practices](../best-practices/README.md)** - Production-ready patterns
3. **[Performance Tuning](../performance/README.md)** - Optimization techniques
4. **[Troubleshooting](../troubleshooting/README.md)** - Common issues and solutions

---

**Need help?** Join our [Discord community](https://discord.gg/ultimate-streaming) or check out our [support portal](mailto:support@ultimate-streaming.com). 