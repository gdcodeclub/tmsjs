const mongoose = require('mongoose')

const EmailSchema = new mongoose.Schema({
  subject: String,
  date: Date,
  messageId: String
})


module.exports = mongoose.model('Email', EmailSchema)
