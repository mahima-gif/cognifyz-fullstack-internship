require('dotenv').config();
const path = require('path');
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, '.cache', 'mongodb-binaries');

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require('./app');
const User = require('./src/models/User');

const PORT = process.env.PORT || 5000;

async function startDemo() {
  console.log('Starting in-memory MongoDB for live browser demo...');
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log(`Connected to In-Memory DB at ${uri}`);

  // Seed default admin
  await User.create({
    name: 'Admin Boss',
    email: 'admin@securetasks.com',
    password: 'AdminSecurePass123!',
    role: 'admin',
  });
  console.log('Seeded demo admin: admin@securetasks.com / AdminSecurePass123!');

  app.listen(PORT, () => {
    console.log(`Live Demo Server running at http://localhost:${PORT}`);
  });
}

startDemo().catch(err => {
  console.error('Demo server error:', err);
  process.exit(1);
});
