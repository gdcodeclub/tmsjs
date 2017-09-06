// move these to test helper at some point
process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'

const agent = require('supertest').agent(require('../../app'))
const chai = require('chai')
const chaiHttp = require('chai-http')
const nock = require('nock')
const should = chai.should()
const querystring = require('querystring');

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

  it('should show sms messages', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/sms')
      .reply(200, [{body: 'welcome to our text'}, {'body': 'sms rulz'}]);

    agent
      .get('/s')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('SMS')
        res.text.should.contain('welcome to our text')
        res.text.should.contain('sms rulz')

        done()
      })
  })

  it('should show inbound messages', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/sms')
      .reply(200, [{body: 'welcome to our text'}, {'body': 'sms rulz'}]);

    agent
      .get('/s')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('SMS')
        res.text.should.contain('welcome to our text')
        res.text.should.contain('sms rulz')

        done()
      })
  })

  it('should show the new email form', (done) => {
    agent
      .get('/newe')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('subject')
        res.text.should.contain('message body')
        res.text.should.contain('recipients')
        res.text.should.contain('Send Message')

        done()
      })
  })

  it('should post email message', (done) => {
    const mockData = {
      subject: 'Hello!',
      body: 'Hi!',
      recipients: [{email:'first@example.com'},{email: 'second@example.com'}]
    }

    const mockResponse = {
      "id": 8675309,
      "subject": "Hello!",
      "body": "Hi!"
    }

    nock(process.env.TMS_URL)
      .post('/messages/email', mockData)
      .reply(200, mockResponse);

    const message = {
      subject: 'Hello!',
      body: 'Hi!',
      recipients: 'first@example.com,second@example.com'
    }

    agent
      .post('/')
      .type('form')
      .send(message)
      .end((err, res) => {
        res.should.have.status(302)
        nock.isDone().should.be.true

        done()
      })
  })
})
