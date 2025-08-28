const { Client } = require("pg");
require("dotenv").config();

async function getClient() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();
  return client;
}

module.exports = getClient;
