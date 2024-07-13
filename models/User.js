const mongoose = require('mongoose');

const weatherSchema = new mongoose.Schema({
  date: String,
  data: String,
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  weatherData: [weatherSchema],
});

module.exports = mongoose.model('User', userSchema);
