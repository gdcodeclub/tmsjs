const express =  require('express')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const request = require('request')
const tmsRoutes = require('./routes/tms')
const port = process.env.PORT ||  8080

const mongoose = require('mongoose')
const databaseUrl = process.env.DATABASEURL || 'mongodb://localhost/tmsjs'
mongoose.connect(databaseUrl)

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
