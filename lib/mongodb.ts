import { MongoClient, Db } from 'mongodb';

// ============================================================================
// MongoDB Connection Management for Serverless/Edge Functions
// ============================================================================

/**
 * Global variable to cache the MongoDB client across function invocations
 * This prevents creating new connections on every API call in serverless environments
 */
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Connect to MongoDB and return the database instance
 * Uses connection pooling and caching for serverless environments
 * 
 * @returns Promise<Db> MongoDB database instance
 * @throws Error if connection fails or environment variables are missing
 */
export async function connectToDatabase(): Promise<Db> {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    return cachedDb;
  }

  // Validate environment variables
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DATABASE;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  if (!dbName) {
    throw new Error('MONGODB_DATABASE environment variable is not defined');
  }

  try {
    // Create new connection
    const client = await MongoClient.connect(uri, {
      // Connection pool settings
      maxPoolSize: 10,        // Max number of connections in the pool
      minPoolSize: 2,         // Min number of connections to maintain
      maxIdleTimeMS: 30000,   // Close idle connections after 30 seconds
      
      // Timeout settings
      serverSelectionTimeoutMS: 5000,  // Fail fast if MongoDB is unreachable
      socketTimeoutMS: 45000,           // Close sockets after 45 seconds of inactivity
      
      // Retry settings
      retryWrites: true,      // Automatically retry write operations
      retryReads: true,       // Automatically retry read operations
    });

    const db = client.db(dbName);

    // Cache the connection
    cachedClient = client;
    cachedDb = db;

    console.log(`Connected to MongoDB database: ${dbName}`);

    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('Database connection failed');
  }
}

/**
 * Get a collection from the database with type safety
 * 
 * @param collectionName Name of the collection to retrieve
 * @returns MongoDB collection instance
 */
export async function getCollection<T extends Document>(collectionName: string) {
  const db = await connectToDatabase();
  return db.collection<T>(collectionName);
}

/**
 * Close the MongoDB connection (typically not needed in serverless)
 * Only use this for graceful shutdown in long-running processes
 */
export async function closeConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Check if the database connection is healthy
 * 
 * @returns Promise<boolean> true if connection is healthy, false otherwise
 */
export async function isConnected(): Promise<boolean> {
  try {
    const db = await connectToDatabase();
    await db.admin().ping();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Initialize database indexes for the TodoList collection
 * Creates unique sparse index on viewId field
 * Should be called on app startup or first database access
 * 
 * @returns Promise<void>
 */
export async function initializeIndexes(): Promise<void> {
  try {
    const db = await connectToDatabase();
    const listsCollection = db.collection('lists');
    
    // Create unique sparse index on viewId (allows undefined values, but enforces uniqueness when present)
    await listsCollection.createIndex(
      { viewId: 1 },
      { 
        unique: true, 
        sparse: true,  // Allows documents without viewId field
        name: 'viewId_1'
      }
    );
    
    console.log('Database indexes initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database indexes:', error);
    // Don't throw - index might already exist
  }
}
