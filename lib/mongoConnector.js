const { MongoClient } = require('mongodb');

class MongoConnector {
  constructor() {
    this.client = null;
    this.db = null;
    this.connected = false;
  }

  async connect(config) {
    try {
      const { host, port, user, password, database } = config;
      
      // Build connection string
      let connectionString;
      if (user && password) {
        connectionString = `mongodb://${user}:${password}@${host}:${port || 27017}/${database}`;
      } else {
        connectionString = `mongodb://${host}:${port || 27017}/${database}`;
      }

      this.client = new MongoClient(connectionString, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      await this.client.connect();
      this.db = this.client.db(database);
      this.connected = true;
      
      console.log('MongoDB connected successfully');
      return true;
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      this.connected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.connected = false;
      console.log('MongoDB disconnected');
    }
  }

  async writeData(key, data) {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      const document = {
        key: key,
        data: data,
        timestamp: new Date(),
        lastModified: new Date()
      };

      // Upsert operation: update if exists, insert if not
      const result = await collection.replaceOne(
        { key: key },
        document,
        { upsert: true }
      );

      return {
        success: true,
        key: key,
        upserted: result.upsertedCount > 0,
        modified: result.modifiedCount > 0
      };
    } catch (error) {
      console.error('MongoDB write error:', error.message);
      throw error;
    }
  }

  async readData(key) {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      const result = await collection.findOne({ key: key });
      
      return result ? {
        key: result.key,
        data: result.data,
        timestamp: result.timestamp,
        lastModified: result.lastModified
      } : null;
    } catch (error) {
      console.error('MongoDB read error:', error.message);
      throw error;
    }
  }

  async getAllKeys() {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }

    try {
      const collection = this.db.collection('stream_data');
      const results = await collection.find({}, { projection: { key: 1, lastModified: 1, _id: 0 } }).toArray();
      
      return results.map(item => ({
        key: item.key,
        lastModified: item.lastModified
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

  isConnected() {
    return this.connected;
  }
}

module.exports = MongoConnector; 