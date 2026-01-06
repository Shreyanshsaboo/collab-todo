#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * Tests MongoDB connection and verifies collections exist
 * Run with: node --env-file=.env.local scripts/test-db-connection.js
 * (Or with ts-node: npx tsx scripts/test-db-connection.ts)
 */

import { connectToDatabase, isConnected, closeConnection } from '../lib/mongodb';

async function testDatabaseConnection() {
  console.log('🔍 Testing MongoDB connection...\n');

  try {
    // Test 1: Check if connection can be established
    console.log('1️⃣ Checking database connectivity...');
    const isHealthy = await isConnected();
    
    if (!isHealthy) {
      console.error('❌ Database connection failed - isConnected() returned false');
      process.exit(1);
    }
    
    console.log('✅ Database connection is healthy\n');

    // Test 2: Get database instance and verify collections
    console.log('2️⃣ Verifying collections...');
    const db = await connectToDatabase();
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collection(s):`);
    collections.forEach((col) => {
      console.log(`   - ${col.name}`);
    });
    
    // Check for required collections
    const collectionNames = collections.map((c) => c.name);
    const requiredCollections = ['TodoList', 'TodoItem'];
    const missingCollections = requiredCollections.filter(
      (name) => !collectionNames.includes(name)
    );
    
    if (missingCollections.length > 0) {
      console.warn(`\n⚠️  Missing collections: ${missingCollections.join(', ')}`);
      console.warn('   These will be created automatically when needed.');
    } else {
      console.log('✅ All required collections exist\n');
    }

    // Test 3: Verify indexes on TodoList collection
    if (collectionNames.includes('TodoList')) {
      console.log('3️⃣ Checking TodoList indexes...');
      const todoListCollection = db.collection('TodoList');
      const indexes = await todoListCollection.indexes();
      
      console.log(`Found ${indexes.length} index(es):`);
      indexes.forEach((idx) => {
        console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
      
      const hasShareIdIndex = indexes.some((idx) => idx.key.shareId === 1);
      if (hasShareIdIndex) {
        console.log('✅ ShareId unique index exists\n');
      } else {
        console.warn('⚠️  ShareId unique index missing - will be created on first write\n');
      }
    }

    // Test 4: Verify indexes on TodoItem collection
    if (collectionNames.includes('TodoItem')) {
      console.log('4️⃣ Checking TodoItem indexes...');
      const todoItemCollection = db.collection('TodoItem');
      const indexes = await todoItemCollection.indexes();
      
      console.log(`Found ${indexes.length} index(es):`);
      indexes.forEach((idx) => {
        console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
      
      const hasListIdIndex = indexes.some((idx) => idx.key.listId === 1);
      const hasCompoundIndex = indexes.some(
        (idx) => idx.key.listId === 1 && idx.key.order === 1
      );
      
      if (hasListIdIndex && hasCompoundIndex) {
        console.log('✅ All TodoItem indexes exist\n');
      } else {
        console.warn('⚠️  Some TodoItem indexes missing - will be created on first write\n');
      }
    }

    console.log('✅ All database connection tests passed!\n');
    
    // Show connection details
    console.log('📋 Connection Details:');
    console.log(`   Database: ${process.env.MONGODB_DATABASE}`);
    console.log(`   URI: ${process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@')}`);
    
  } catch (error) {
    console.error('❌ Database connection test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    // Close connection
    await closeConnection();
    console.log('\n🔌 Connection closed');
  }
}

// Run the test
testDatabaseConnection();
