const mongoose = require('mongoose')

const SmsSchema = new mongoose.Schema({
  body: String,
  date: Date,
  messageId: String
})


module.exports = mongoose.model('Sms', SmsSchema)
