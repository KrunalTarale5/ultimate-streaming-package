const stream = require('./index'); // Use 'realtime-stream-package' when installed from npm

async function main() {
  try {
    console.log('🚀 Starting Realtime Stream Package Example\n');

    // Initialize with MongoDB (change to MySQL if you prefer)
    await stream.init({
      dbType: "mongodb", // or "mysql"
      host: "localhost",
      port: 27017, // 3306 for MySQL
      user: "your_username",
      password: "your_password",
      database: "test_db",
      pollingInterval: 1000, // Poll every 1 second
      debug: true // Enable detailed logging
    });

    console.log('✅ Package initialized successfully!\n');

    // Example 1: Listen for user status changes
    console.log('📢 Setting up listeners...');
    
    const userStatusUnsubscribe = stream.on("userStatus", (data, meta) => {
      console.log(`\n🔔 User Status Change Detected!`);
      console.log(`   Type: ${meta.changeType}`);
      console.log(`   Data:`, data);
      console.log(`   Time: ${meta.timestamp.toISOString()}`);
    });

    // Example 2: Listen for configuration changes
    const configUnsubscribe = stream.on("appConfig", (data, meta) => {
      console.log(`\n⚙️  App Config Change Detected!`);
      console.log(`   Type: ${meta.changeType}`);
      console.log(`   Data:`, data);
    });

    // Example 3: Listen for inventory updates
    stream.on("inventory", (data, meta) => {
      console.log(`\n📦 Inventory Update!`);
      console.log(`   Type: ${meta.changeType}`);
      console.log(`   Data:`, data);
    });

    console.log('✅ Listeners set up successfully!\n');

    // Wait a moment then start pushing data
    setTimeout(async () => {
      console.log('📤 Starting to push data...\n');

      // Push user status
      await stream.push("userStatus", {
        userId: 123,
        username: "john_doe",
        online: true,
        lastSeen: new Date()
      });
      console.log('✅ Pushed user status');

      // Push app configuration
      await stream.push("appConfig", {
        theme: "dark",
        language: "en",
        notifications: true,
        version: "1.0.0"
      });
      console.log('✅ Pushed app config');

      // Push inventory data
      await stream.push("inventory", {
        productId: 456,
        name: "Gaming Laptop",
        price: 1299.99,
        stock: 15,
        category: "Electronics"
      });
      console.log('✅ Pushed inventory data\n');

    }, 2000);

    // Update data after 5 seconds
    setTimeout(async () => {
      console.log('🔄 Updating data...\n');

      // Update user status
      await stream.push("userStatus", {
        userId: 123,
        username: "john_doe",
        online: false,
        lastSeen: new Date()
      });

      // Update inventory
      await stream.push("inventory", {
        productId: 456,
        name: "Gaming Laptop",
        price: 1199.99, // Price changed
        stock: 12, // Stock decreased
        category: "Electronics"
      });

    }, 5000);

    // Show status after 8 seconds
    setTimeout(async () => {
      console.log('\n📊 Current Status:');
      const status = stream.getStatus();
      console.log(JSON.stringify(status, null, 2));

      console.log('\n🗂️  All Keys:');
      const keys = await stream.getAllKeys();
      console.log(keys);

    }, 8000);

    // Demonstrate get operation
    setTimeout(async () => {
      console.log('\n🔍 Getting current data...');
      
      const userStatus = await stream.get("userStatus");
      console.log('Current user status:', userStatus);

      const config = await stream.get("appConfig");
      console.log('Current app config:', config);

    }, 10000);

    // Cleanup after 15 seconds
    setTimeout(async () => {
      console.log('\n🧹 Cleaning up...');
      
      // Unsubscribe from specific listeners
      userStatusUnsubscribe();
      configUnsubscribe();
      
      // Remove all listeners for inventory
      stream.removeAllListeners("inventory");
      
      // Destroy the package
      await stream.destroy();
      
      console.log('✅ Cleanup completed. Example finished!');
      process.exit(0);
    }, 15000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await stream.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await stream.destroy();
  process.exit(0);
});

// Run the example
main().catch(console.error); 