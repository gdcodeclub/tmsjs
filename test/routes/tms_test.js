const agent = require('supertest').agent(require('../../app'))
const chai = require('chai')
const chaiHttp = require('chai-http')
const http = require('http')
const nock = require('nock')
const should = chai.should()

chai.use(chaiHttp);

describe('routes', () => {
  it('should show from addresses', (done) => {
    nock(process.env.TMS_URL)
      .get('/from_addresses')
      .reply(200,  [{from_email: 'first@from.com'}, {from_email: 'second@from.com'}] )

    agent
      .get('/fa')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('From Addresses')
        res.text.should.contain('first@from.com')
        res.text.should.contain('second@from.com')

        done()
      })
  })

  it('should show email messages', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{subject: 'first email'}, {'subject': 'second email'}]);


    agent
      .get('/m')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('Subject Line')
        res.text.should.contain('first email')
        res.text.should.contain('second email')

        done()
      })
  })
})
