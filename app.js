var express =  require('express')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var request = require('request')
var tmsRoutes = require('./routes/tms')
var port = process.env.PORT ||  8080
var ip = process.env.IP || 'localhost'
var app = express()

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static(__dirname + '/public'))
app.use(methodOverride('_method'))

app.use(tmsRoutes)



var server = app.listen(port, ip, function(){
  console.log('listening at ' + ip + ':' + port)
})

module.exports = server
