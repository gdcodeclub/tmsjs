const mongoose = require('mongoose');

const RecipientSchema = new mongoose.Schema({
  email: String,
  phone: String,
  messageId: String
})


module.exports = mongoose.model('Recipient', RecipientSchema)
