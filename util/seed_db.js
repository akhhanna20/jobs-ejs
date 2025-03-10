const { faker } = require('@faker-js/faker');
const FactoryBot = require('factory-bot');
const Job = require('../models/Job');
const User = require('../models/User');
require('dotenv').config();

const testUserPassword = 'password123'; // Set a fixed test password
const factory = FactoryBot.factory;
const factoryAdapter = new FactoryBot.MongooseAdapter();
factory.setAdapter(factoryAdapter);

// Define FactoryBot model for Job
factory.define('job', Job, {
  company: () => faker.company.name(),
  position: () => faker.person.jobTitle(),
  status: () =>
    ['interview', 'declined', 'pending'][Math.floor(3 * Math.random())],
});

// Define FactoryBot model for User
factory.define('user', User, {
  name: () => faker.person.fullName(),
  email: () => faker.internet.email(),
  password: () => testUserPassword, // Use consistent test password
});

const seed_db = async () => {
  let testUser = null;
  try {
    const mongoURL = process.env.MONGO_URI_TEST;
    await Job.deleteMany({});
    await User.deleteMany({});

    // Create the test user
    testUser = await factory.create('user', { password: testUserPassword });

    // Create 20 jobs linked to the test user
    await factory.createMany('job', 20, { createdBy: testUser._id });
  } catch (e) {
    console.log('Database error:', e);
    throw e;
  }

  return testUser;
};

module.exports = { testUserPassword, factory, seed_db };
