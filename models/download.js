const mongoose = require('mongoose')

const DownloadSchema = new mongoose.Schema({
  date: String
})

module.exports = mongoose.model('Download', DownloadSchema)
