const { clearHash } = require("../services/cache");

module.exports = async (req, res, next) => {
  await next();

  clearHash(`Blogs:${req.user.id}`);
};
