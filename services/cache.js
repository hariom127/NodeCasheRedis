const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");

const redisUrl = "redis://127.0.0.1:6379";
const client = redis.createClient(redisUrl);
client.hget = util.promisify(client.hget);

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "");
  return this;
};

mongoose.Query.prototype.exec = async function () {
  console.log("I am about to run query");
  if (!this.useCache) {
    const result = await exec.apply(this, arguments);
    return result;
  }

  //create a key for redis cache
  // key is the combination of query options and collection name

  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name,
    })
  );

  // see if we have value for key in redis
  const cache = JSON.parse(await client.hget(this.hashKey, key));

  // if we do, return that
  if (cache && cache.length) {
    console.log("Serving from cache");
    return Array.isArray(cache)
      ? cache.map((d) => new this.model(d))
      : new this.model(cache);
  }
  //otherwise do query exce and store data in redis cache
  const result = await exec.apply(this, arguments);
  client.hset(this.hashKey, key, JSON.stringify(result), "EX", 10);
  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
};
