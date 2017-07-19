const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema({
  email: String,
  phone: String
});

module.exports = mongoose.model('Recipient', recipientSchema);
