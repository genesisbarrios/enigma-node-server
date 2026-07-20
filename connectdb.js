/**
Source :
https://github.com/vercel/next.js/blob/canary/examples/with-mongodb-mongoose/utils/dbConnect.js
**/
require('dotenv').config();
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

const GENWAV_MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/genwav';
const GENWAV_MONGODB_DB = process.env.MONGODB_DB || null;
const ENIGMA_MONGODB_URI = process.env.ENIGMA_MONGODB_URI || process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/enigma';
const ENIGMA_MONGODB_DB = process.env.ENIGMA_MONGODB_DB || process.env.MONGODB_DB || null;

const globalWithMongoose = global;
if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = {
    genwavConn: null,
    genwavPromise: null,
    enigmaConn: null,
    enigmaPromise: null
  };
}

const cached = globalWithMongoose.mongoose;

const connectGenwavDb = async () => {
  if (cached.genwavConn?.readyState >= 1) {
    return cached.genwavConn;
  }

  if (!cached.genwavPromise) {
    const options = GENWAV_MONGODB_DB ? { dbName: GENWAV_MONGODB_DB } : {};
    cached.genwavPromise = mongoose.createConnection(GENWAV_MONGODB_URI, options).asPromise();
  }

  cached.genwavConn = await cached.genwavPromise;
  return cached.genwavConn;
};

const connectEnigmaDb = async () => {
  if (cached.enigmaConn?.readyState >= 1) {
    return cached.enigmaConn;
  }

  if (!cached.enigmaPromise) {
    const options = ENIGMA_MONGODB_DB ? { dbName: ENIGMA_MONGODB_DB } : {};
    cached.enigmaPromise = mongoose.createConnection(ENIGMA_MONGODB_URI, options).asPromise();
  }

  cached.enigmaConn = await cached.enigmaPromise;
  return cached.enigmaConn;
};

module.exports = connectGenwavDb;
module.exports.connectGenwavDb = connectGenwavDb;
module.exports.connectEnigmaDb = connectEnigmaDb;