const mongoose = require('mongoose')

const SmsSchema = new mongoose.Schema({
  body: String,
  date: String,
  messageId: String
})


module.exports = mongoose.model('Sms', SmsSchema)
