/**
 * Configuration object for initializing the realtime stream package
 */
export interface StreamConfig {
  /** Database type: 'mongodb' or 'mysql' */
  dbType: 'mongodb' | 'mysql';
  /** Database host */
  host: string;
  /** Database port (optional) */
  port?: number;
  /** Database username */
  user: string;
  /** Database password */
  password: string;
  /** Database name */
  database: string;
  /** Polling interval in milliseconds (default: 2000) */
  pollingInterval?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Callback function for data changes
 */
export type StreamCallback = (data: any, meta: {
  key: string;
  changeType: 'created' | 'updated' | 'deleted';
  timestamp: Date;
}) => void;

/**
 * Unsubscribe function returned by the on() method
 */
export type UnsubscribeFunction = () => void;

/**
 * Result object for write operations
 */
export interface WriteResult {
  success: boolean;
  key: string;
  upserted: boolean;
  modified: boolean;
}

/**
 * Result object for delete operations
 */
export interface DeleteResult {
  success: boolean;
  deleted: boolean;
}

/**
 * Key information object
 */
export interface KeyInfo {
  key: string;
  lastModified: Date;
}

/**
 * Heartbeat system status
 */
export interface HeartbeatStatus {
  isPolling: boolean;
  pollingInterval: number;
  listenerCount: number;
  cacheSize: number;
  lastPollTime: Date | null;
  watchedKeys: string[];
}

/**
 * Package status information
 */
export interface PackageStatus {
  initialized: boolean;
  dbType?: string;
  dbConnected?: boolean;
  heartbeat?: HeartbeatStatus;
}

/**
 * Main package interface
 */
export interface RealtimeStreamPackage {
  /**
   * Initialize the streaming package with database configuration
   * @param config Configuration object
   * @returns Promise that resolves to true on success
   */
  init(config: StreamConfig): Promise<boolean>;

  /**
   * Listen for changes to a specific key
   * @param key The key to listen for changes
   * @param callback Callback function to be called when data changes
   * @returns Unsubscribe function
   */
  on(key: string, callback: StreamCallback): UnsubscribeFunction;

  /**
   * Push data to a specific key
   * @param key The key to update
   * @param data The data to store (will be JSON serialized)
   * @returns Promise that resolves to operation result
   */
  push(key: string, data: any): Promise<WriteResult>;

  /**
   * Get current data for a key without listening for changes
   * @param key The key to retrieve data for
   * @returns Promise that resolves to the current data or null if not found
   */
  get(key: string): Promise<any>;

  /**
   * Delete data for a specific key
   * @param key The key to delete
   * @returns Promise that resolves to operation result
   */
  delete(key: string): Promise<DeleteResult>;

  /**
   * Remove a specific listener for a key
   * @param key The key to remove listener from
   * @param callback The specific callback to remove
   */
  off(key: string, callback: StreamCallback): void;

  /**
   * Remove all listeners for a key (or all keys if key is not provided)
   * @param key The key to remove listeners from (optional)
   */
  removeAllListeners(key?: string): void;

  /**
   * Set the polling interval
   * @param interval Polling interval in milliseconds (minimum 100ms)
   */
  setPollingInterval(interval: number): void;

  /**
   * Get current status and statistics
   * @returns Status information object
   */
  getStatus(): PackageStatus;

  /**
   * Get all available keys in the database
   * @returns Promise that resolves to array of key objects
   */
  getAllKeys(): Promise<KeyInfo[]>;

  /**
   * Destroy and cleanup the package instance
   * @returns Promise that resolves when cleanup is complete
   */
  destroy(): Promise<void>;
}

/**
 * The main package export
 */
declare const streamInstance: RealtimeStreamPackage;

export = streamInstance; 