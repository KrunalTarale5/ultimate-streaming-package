const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Simulate continuous activity for demo purposes
async function simulateActivity() {
  console.log('🎭 Starting demo activity simulation...');
  
  const actions = ['new-order', 'update-stock', 'status-update'];
  
  setInterval(async () => {
    try {
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      
      const response = await axios.post(`${BASE_URL}/api/simulate/${randomAction}`);
      
      if (response.data.success) {
        console.log(`✅ Simulated: ${randomAction} at ${new Date().toISOString()}`);
      }
      
    } catch (error) {
      console.error('❌ Simulation error:', error.message);
    }
  }, Math.random() * 10000 + 5000); // Random interval between 5-15 seconds
}

// Health check before starting simulation
async function checkServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Server is healthy:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Checking server health...');
  
  const isHealthy = await checkServerHealth();
  
  if (isHealthy) {
    await simulateActivity();
  } else {
    console.log('❌ Server not available. Make sure to start the server first with: npm start');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping simulation...');
  process.exit(0);
});

main(); 