const mongoose = require('mongoose')

const EmailSchema = new mongoose.Schema({
  subject: String,
  date: String,
  messageId: String
})


module.exports = mongoose.model('Email', EmailSchema)
