const mysql = require('mysql2/promise');

class MySQLConnector {
  constructor() {
    this.connection = null;
    this.connected = false;
  }

  async connect(config) {
    try {
      const { host, port, user, password, database } = config;
      
      const connectionConfig = {
        host: host,
        port: port || 3306,
        user: user,
        password: password,
        database: database,
        charset: 'utf8mb4',
        timezone: '+00:00',
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      };

      this.connection = await mysql.createConnection(connectionConfig);
      this.connected = true;

      // Create the stream_data table if it doesn't exist
      await this.createTable();
      
      console.log('MySQL connected successfully');
      return true;
    } catch (error) {
      console.error('MySQL connection failed:', error.message);
      this.connected = false;
      throw error;
    }
  }

  async createTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS stream_data (
          id INT AUTO_INCREMENT PRIMARY KEY,
          \`key\` VARCHAR(255) UNIQUE NOT NULL,
          data JSON NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_key (\`key\`),
          INDEX idx_last_modified (last_modified)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;
      
      await this.connection.execute(createTableQuery);
    } catch (error) {
      console.error('MySQL table creation error:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      this.connected = false;
      console.log('MySQL disconnected');
    }
  }

  async writeData(key, data) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      // Use ON DUPLICATE KEY UPDATE for upsert functionality
      const query = `
        INSERT INTO stream_data (\`key\`, data, timestamp, last_modified)
        VALUES (?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          data = VALUES(data),
          last_modified = NOW()
      `;
      
      const [result] = await this.connection.execute(query, [
        key,
        JSON.stringify(data)
      ]);

      return {
        success: true,
        key: key,
        upserted: result.insertId > 0,
        modified: result.changedRows > 0
      };
    } catch (error) {
      console.error('MySQL write error:', error.message);
      throw error;
    }
  }

  async readData(key) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const query = 'SELECT `key`, data, timestamp, last_modified FROM stream_data WHERE `key` = ?';
      const [rows] = await this.connection.execute(query, [key]);
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        key: row.key,
        data: JSON.parse(row.data),
        timestamp: row.timestamp,
        lastModified: row.last_modified
      };
    } catch (error) {
      console.error('MySQL read error:', error.message);
      throw error;
    }
  }

  async getAllKeys() {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const query = 'SELECT `key`, last_modified FROM stream_data ORDER BY last_modified DESC';
      const [rows] = await this.connection.execute(query);
      
      return rows.map(row => ({
        key: row.key,
        lastModified: row.last_modified
      }));
    } catch (error) {
      console.error('MySQL getAllKeys error:', error.message);
      throw error;
    }
  }

  async deleteData(key) {
    if (!this.connected) {
      throw new Error('MySQL not connected');
    }

    try {
      const query = 'DELETE FROM stream_data WHERE `key` = ?';
      const [result] = await this.connection.execute(query, [key]);
      
      return {
        success: true,
        deleted: result.affectedRows > 0
      };
    } catch (error) {
      console.error('MySQL delete error:', error.message);
      throw error;
    }
  }

  isConnected() {
    return this.connected;
  }
}

module.exports = MySQLConnector; 