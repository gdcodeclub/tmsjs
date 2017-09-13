const express =  require('express')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const request = require('request')
const tmsRoutes = require('./routes/tms')
const port = process.env.PORT ||  8080

// Don't rely on mongodb when running tests
if (process.env.TMS_URL != 'https://fake.tms.url.com') {
  const mongoose = require('mongoose')
  const databaseUrl = process.env.DATABASEURL || 'mongodb://localhost/tmsjs'
  mongoose.connect(databaseUrl)
  const db = mongoose.connection;
  db.on('connection', console.error.bind(console, 'MongoDB connection success:'))
  db.on('error', console.error.bind(console, 'MongoDB connection error:'));
  console.log('INITIALIZED DATABASE', databaseUrl)
}

const app = express()

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))
app.use(methodOverride('_method'))
app.use(tmsRoutes)

const server = app.listen(port, function(){
  console.log('listening at ' + port)
})

module.exports = server
