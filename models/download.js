const mongoose = require('mongoose')

const DownloadSchema = new mongoose.Schema({
  date: Date
})

module.exports = mongoose.model('Download', DownloadSchema)
