var express = require('express')
var router = express.Router()
var axios = require('axios')
var engine = axios.create({
  baseURL: 'https://stage-tms.govdelivery.com',
  headers: {'X-Auth-Token': process.env.TMS_KEY}})

router.get('/fa', function(req, res){
  return engine
      .get('/from_addresses')
      .then(function(result){
        console.log(result.data)
        res.render('../views/account_info', {data: result.data})
      }).catch(function(error){
        console.log('error getting data from TMS: did you set TMS_KEY?', error)
        res.redirect('/')
      })
})

module.exports = router
