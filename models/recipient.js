const mongoose = require('mongoose')

const RecipientSchema = new mongoose.Schema({
  email: String,
  phone: String,
  messageId: String,
  recipientId: String
})


module.exports = mongoose.model('Recipient', RecipientSchema)
