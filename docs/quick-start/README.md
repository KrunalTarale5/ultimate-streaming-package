# Quick Start Guide - Ultimate Streaming Package

Get your real-time application up and running in **under 5 minutes**! 🚀

## 📦 Installation

```bash
npm install realtime-stream-package
```

## ⚡ 30-Second Setup

### 1. Basic MongoDB Setup

```javascript
const RealtimeStreamPackage = require('realtime-stream-package');

// Create instance
const streamer = new RealtimeStreamPackage();

// Initialize (replace with your database details)
await streamer.init({
  dbType: 'mongodb',
  host: 'localhost',
  port: 27017,
  user: 'your_username',
  password: 'your_password',
  database: 'your_database'
});

// Listen for changes
streamer.on('users', (data, meta) => {
  console.log('🔥 Real-time update:', data);
  console.log('📝 Change type:', meta.changeType);
});

// Start monitoring
await streamer.start();

console.log('✅ Real-time streaming active!');
```

### 2. Basic MySQL Setup

```javascript
const RealtimeStreamPackage = require('realtime-stream-package');

const streamer = new RealtimeStreamPackage();

await streamer.init({
  dbType: 'mysql',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'password',
  database: 'myapp'
});

streamer.on('orders', (order, meta) => {
  console.log('📦 New order:', order);
});

await streamer.start();
```

That's it! Your application now has real-time superpowers. 🎉

## 🎯 Common Use Cases (Copy & Paste Ready)

### Real-time Chat Messages

```javascript
// Listen for new chat messages
streamer.on('messages', (message, meta) => {
  if (meta.changeType === 'created') {
    // New message received
    displayMessage(message);
    playNotificationSound();
  }
});

// Send a message
await streamer.write('messages', `msg_${Date.now()}`, {
  text: 'Hello, world!',
  userId: 'user123',
  timestamp: new Date(),
  roomId: 'general'
});
```

### Live Inventory Updates

```javascript
// Monitor inventory changes
streamer.on('products', (product, meta) => {
  if (product.stock < 10) {
    showLowStockAlert(product);
  }
  
  updateProductDisplay(product);
}, {
  filter: { category: 'electronics' } // Only electronics
});

// Update inventory
await streamer.write('products', 'laptop-123', {
  name: 'Gaming Laptop',
  stock: 5,
  price: 1299.99
});
```

### Real-time Dashboard Metrics

```javascript
// Batch process analytics for dashboards
streamer.onBatch('analytics', (events) => {
  const metrics = processAnalytics(events);
  updateDashboard(metrics);
}, {
  batchSize: 100,
  batchTimeout: 5000 // Update every 5 seconds
});
```

### User Presence Tracking

```javascript
// Track user online status
streamer.on('users', (user, meta) => {
  if (meta.changeType === 'updated' && user.lastSeen) {
    updateUserPresence(user.id, user.isOnline);
  }
});

// Update user status
setInterval(async () => {
  await streamer.write('users', currentUserId, {
    lastSeen: new Date(),
    isOnline: true
  });
}, 30000); // Every 30 seconds
```

### Order Status Updates

```javascript
// Real-time order tracking
streamer.on('orders', (order, meta) => {
  if (meta.changeType === 'updated') {
    notifyCustomer(order.customerId, {
      message: `Order ${order.id} is now ${order.status}`,
      orderId: order.id,
      status: order.status
    });
  }
});
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
  debug: true,           // Enable detailed logging
  pollingInterval: 2000  // 2-second polling
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
  debug: false,
  pollingInterval: 500,  // Faster polling for production
  retries: 10           // More retries for stability
};
```

### Cloud MongoDB (Atlas)

```javascript
const cloudConfig = {
  dbType: 'mongodb',
  host: 'your-cluster.mongodb.net',
  user: 'your-username',
  password: 'your-password',
  database: 'your-database',
  ssl: true,
  authSource: 'admin'
};
```

## 🚦 Environment Variables Setup

Create a `.env` file:

```bash
# Database Configuration
DB_TYPE=mongodb
DB_HOST=localhost
DB_PORT=27017
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database

# Streaming Configuration
STREAMING_DEBUG=true
STREAMING_POLLING_INTERVAL=1000
STREAMING_RETRIES=5
```

Use in your code:

```javascript
require('dotenv').config();

const config = {
  dbType: process.env.DB_TYPE,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  debug: process.env.STREAMING_DEBUG === 'true',
  pollingInterval: parseInt(process.env.STREAMING_POLLING_INTERVAL),
  retries: parseInt(process.env.STREAMING_RETRIES)
};
```

## 🐛 Error Handling (Essential)

```javascript
const streamer = new RealtimeStreamPackage();

try {
  await streamer.init(config);
  
  // Handle connection events
  streamer.on('connected', () => {
    console.log('✅ Connected to database');
  });
  
  streamer.on('disconnected', () => {
    console.log('❌ Lost connection');
  });
  
  streamer.on('reconnected', () => {
    console.log('🔄 Reconnected successfully');
  });
  
  // Handle errors
  streamer.on('error', (error) => {
    console.error('💥 Error:', error.message);
    
    // Implement your error handling logic
    if (error.code === 'CONNECTION_LOST') {
      // Maybe show a "reconnecting..." message to users
      showReconnectingMessage();
    }
  });
  
  await streamer.start();
  
} catch (error) {
  console.error('Failed to initialize:', error.message);
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await streamer.stop();
  await streamer.destroy();
  process.exit(0);
});
```

## 🌐 Express.js Integration

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

async function setupRealtime() {
  await streamer.init(config);
  
  // Forward database changes to WebSocket clients
  streamer.on('messages', (message, meta) => {
    io.emit('new_message', { message, meta });
  });
  
  streamer.on('users', (user, meta) => {
    io.emit('user_update', { user, meta });
  });
  
  await streamer.start();
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('send_message', async (data) => {
    // Write to database (triggers real-time update)
    await streamer.write('messages', `msg_${Date.now()}`, {
      text: data.text,
      userId: data.userId,
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

setupRealtime().then(() => {
  server.listen(3000, () => {
    console.log('🚀 Server running on port 3000');
  });
});
```

## 📱 React Integration

```jsx
import { useEffect, useState } from 'react';
const RealtimeStreamPackage = require('realtime-stream-package');

// Custom hook for real-time data
function useRealtimeData(collection, config) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const streamer = new RealtimeStreamPackage();
    
    const initStreaming = async () => {
      try {
        await streamer.init(config);
        
        // Listen for changes
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
        
        // Load initial data
        const initialData = await streamer.query(collection, {});
        setData(initialData);
        
        await streamer.start();
        setLoading(false);
        
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    initStreaming();

    return () => {
      streamer.destroy();
    };
  }, [collection, config]);

  return { data, loading, error };
}

// Component using the hook
function MessagesList() {
  const { data: messages, loading, error } = useRealtimeData('messages', {
    dbType: 'mongodb',
    host: 'localhost',
    // ... your config
  });

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {messages.map(message => (
        <div key={message._id}>
          <strong>{message.userId}:</strong> {message.text}
        </div>
      ))}
    </div>
  );
}
```

## 🧪 Testing Your Setup

```javascript
// test-streaming.js
const RealtimeStreamPackage = require('realtime-stream-package');

async function testStreaming() {
  const streamer = new RealtimeStreamPackage();
  
  try {
    console.log('🔌 Connecting to database...');
    await streamer.init({
      dbType: 'mongodb',
      host: 'localhost',
      port: 27017,
      user: 'your_username',
      password: 'your_password',
      database: 'test_db'
    });
    
    console.log('👂 Setting up listener...');
    streamer.on('test_collection', (data, meta) => {
      console.log('✨ Received update:', data);
      console.log('📋 Meta:', meta);
    });
    
    console.log('🚀 Starting streaming...');
    await streamer.start();
    
    console.log('✍️  Writing test data...');
    await streamer.write('test_collection', 'test_key', {
      message: 'Hello, real-time world!',
      timestamp: new Date()
    });
    
    console.log('✅ Test complete! Check for real-time updates above.');
    
    // Clean up after 5 seconds
    setTimeout(async () => {
      await streamer.destroy();
      console.log('🧹 Cleaned up resources');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testStreaming();
```

Run the test:
```bash
node test-streaming.js
```

## 🚨 Common Issues & Quick Fixes

### Issue: "Connection refused"
```javascript
// Check your database is running and accessible
// For MongoDB: mongod --dbpath /data/db
// For MySQL: sudo service mysql start
```

### Issue: "Authentication failed"
```javascript
// Verify your credentials
const config = {
  // ... other config
  user: 'correct_username',      // ✅ Correct
  password: 'correct_password',  // ✅ Correct
  authSource: 'admin'           // 📝 For MongoDB Atlas
};
```

### Issue: "No changes detected"
```javascript
// Make sure your collection/table exists and has data
await streamer.write('test_collection', 'test_id', {
  test: 'data'
});
```

### Issue: "High memory usage"
```javascript
// Use batch processing for high-frequency updates
streamer.onBatch('high_volume_collection', (changes) => {
  processBatch(changes);
}, {
  batchSize: 100,
  batchTimeout: 1000
});
```

## 📚 Next Steps

1. **[Complete Integration Guide](../integration/README.md)** - Detailed integration patterns
2. **[API Reference](../api-reference/README.md)** - All available methods
3. **[Best Practices](../best-practices/README.md)** - Production-ready patterns
4. **[Performance Tuning](../performance/README.md)** - Optimization techniques
5. **[Live Demo](../../demo/README.md)** - See it in action

## 💬 Need Help?

- 💬 **Discord**: [Join our community](https://discord.gg/ultimate-streaming)
- 📧 **Email**: support@ultimate-streaming.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/ultimate-streaming/issues)
- 📖 **Docs**: [Full Documentation](../README.md)

---

**🎉 Congratulations! You now have real-time streaming in your application.**

*What will you build with sub-millisecond real-time updates?* 