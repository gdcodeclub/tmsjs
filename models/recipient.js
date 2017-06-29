var mongoose = require('mongoose');

var recipientSchema = new mongoose.Schema({
  email: String,
  phone: String
});

module.exports = mongoose.model('Recipient', recipientSchema);
