require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * seedAdmin: Database Seeding Script
 * Creates an administrative account using credentials specified in .env.
 * Run via: npm run seed
 */
const seedAdmin = async () => {
  try {
    const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!MONGO_URI) {
      console.error('\x1b[31m[Seed Error]\x1b[0m MONGO_URI is missing in .env');
      process.exit(1);
    }

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('\x1b[31m[Seed Error]\x1b[0m ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env');
      process.exit(1);
    }

    if (ADMIN_PASSWORD.length < 8) {
      console.error('\x1b[31m[Seed Error]\x1b[0m ADMIN_PASSWORD must be at least 8 characters long');
      process.exit(1);
    }

    console.log('\x1b[34m[Seed]\x1b[0m Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('\x1b[32m[Seed]\x1b[0m Connected to database successfully.');

    // Check if user already exists
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    if (existingAdmin) {
      existingAdmin.role = 'admin';
      existingAdmin.password = ADMIN_PASSWORD;
      await existingAdmin.save();
      console.log(`\x1b[32m[Seed Success]\x1b[0m Admin user '${ADMIN_EMAIL}' updated with role 'admin' and current password from .env.`);
    } else {
      const admin = await User.create({
        name: 'System Administrator',
        email: ADMIN_EMAIL.toLowerCase(),
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log(`\x1b[32m[Seed Success]\x1b[0m Admin user created successfully:`);
      console.log(`  Name:  ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Role:  ${admin.role}`);
    }

    await mongoose.disconnect();
    console.log('\x1b[32m[Seed]\x1b[0m Disconnected from database. Seed process complete.');
    process.exit(0);
  } catch (error) {
    console.error('\x1b[31m[Seed Failure]\x1b[0m An error occurred while seeding admin:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

seedAdmin();
