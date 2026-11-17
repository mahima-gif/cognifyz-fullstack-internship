const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Logs clear connection details on success, and on failure provides
 * diagnostic troubleshooting steps before terminating the process.
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('\x1b[31m[Database Error]\x1b[0m MONGO_URI is not defined in environment variables.');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoUri);

    console.log(`\x1b[32m[Database Connected]\x1b[0m MongoDB host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('\x1b[31m====================================================\x1b[0m');
    console.error('\x1b[31m[Database Connection Failed]\x1b[0m Error details:', error.message);
    console.error('\x1b[33mTroubleshooting Guide:\x1b[0m');
    console.error(' 1. Check your .env file: is MONGO_URI properly configured?');
    console.error(' 2. If running locally: is the MongoDB service (mongod) started and listening on port 27017?');
    console.error(' 3. If using MongoDB Atlas:');
    console.error('    - Verify database username and password in the connection string.');
    console.error('    - Ensure your current IP address is whitelisted in Atlas Network Access (0.0.0.0/0 for testing).');
    console.error('    - Verify DNS resolution and firewall allows outbound connections on port 27017.');
    console.error('\x1b[31m====================================================\x1b[0m');

    // Exit process with failure code
    process.exit(1);
  }
};

module.exports = connectDB;
