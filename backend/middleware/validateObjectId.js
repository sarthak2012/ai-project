const mongoose = require('mongoose');

const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const value = req.params[paramName];
  if (!mongoose.Types.ObjectId.isValid(value)) {
    res.status(400);
    return next(new Error(`Invalid ${paramName}`));
  }
  next();
};

module.exports = validateObjectId;
