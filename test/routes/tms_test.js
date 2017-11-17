// move these to test helper
process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'

const agent = require('supertest').agent(require('../../app'))
const chai = require('chai')
const chaiHttp = require('chai-http')
const nock = require('nock')
const should = chai.should()
const sinon = require('sinon')
const recipientHelper = require('../../helpers/recipient_helper')
var stub
chai.use(chaiHttp);

describe('routes', () => {

  it('should show from addresses', (done) => {
    nock(process.env.TMS_URL)
      .get('/from_addresses')
      .reply(200, [{from_email: 'first@from.com'}, {from_email: 'second@from.com'}] )

    agent
      .get('/fa')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('From Addresses')
        res.text.should.contain('first@from.com')
        res.text.should.contain('second@from.com')

        nock.isDone().should.be.true
        done()
      })
  })

  it('should handle error during show from addresses', (done) => {
    nock(process.env.TMS_URL)
      .get('/from_addresses')
      .replyWithError('error')

    agent
      .get('/fa')
      .end((err, res) => {
        res.should.have.status(302)
        res.should.redirectTo('/')

        nock.isDone().should.be.true
        done()
      })
  })

  it('should show email messages', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'subject': 'first email'}, {'subject': 'second email'}]);

    agent
      .get('/m')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('Subject Line')
        res.text.should.contain('first email')
        res.text.should.contain('second email')

        nock.isDone().should.be.true
        done()
      })
  })

  it('should handle error during show email messages', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/email')
      .replyWithError('error')

    agent
      .get('/m')
      .end((err, res) => {
        res.should.have.status(302)
        res.should.redirectTo('/')

        nock.isDone().should.be.true
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

        nock.isDone().should.be.true
        done()
      })
  })

  it('should handle error during show sms messages', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/sms')
      .replyWithError('error')

    agent
      .get('/s')
      .end((err, res) => {
        res.should.have.status(302)
        res.should.redirectTo('/')

        nock.isDone().should.be.true
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
        nock.isDone().should.be.true

        done()
      })
  })

  describe('mocking executePromises', () => {
    beforeEach(function() {
      stub = sinon.stub(recipientHelper, 'executePromises')
    });

    afterEach(function() {
      stub.restore()
    })

    it ('should populate local store with email recipient data', (done) => {
      const first = nock(process.env.TMS_URL)
        .get('/messages/email')
        .reply(200, [{'id': 1, 'subject': 'first email'}, {'id': 2, 'subject': 'second email'}])
      const second = nock(process.env.TMS_URL)
        .get('/messages/email/1/recipients')
        .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/11111'}}, {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/22222'}}])
      const third = nock(process.env.TMS_URL)
        .get('/messages/email/2/recipients')
        .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/33333'}}, {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/44444'}}])

      agent
        .get('/slurpe')
        .then(res => {
          res.should.have.status(302)
          first.isDone().should.be.true
          second.isDone().should.be.true
          third.isDone().should.be.true
          stub.getCall(0).args[0].should.have.lengthOf(2)
          stub.getCall(1).args[0].should.have.lengthOf(4)
          stub.callCount.should.eq(2)

          done()
        }).catch(function(err) {
          return done(err)
        })
    })

    it('should handle error', (done) => {
      const first = nock(process.env.TMS_URL)
        .get('/messages/email')
        .replyWithError('error')

      agent
        .get('/slurpe')
        .then(res => {
          res.should.have.status(302)
          res.should.redirectTo('/')
          first.isDone().should.be.true

          done()
        }).catch(function(err) {
          return done(err)
        })
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

        done(err)
      })
  })

  it('should handle error for post email message', (done) => {
    const message = {
      subject: 'Hello!',
      body: 'Hi!',
      recipients: 'first@example.com,second@example.com'
    }

    nock(process.env.TMS_URL)
      .post('/messages/email')
      .replyWithError('error')

    agent
      .post('/')
      .type('form')
      .send(message)
      .end((err, res) => {
        res.should.have.status(302)
        res.should.redirectTo('/')

        done(err)
      })
  })

  it('should show saved email messages', (done) => {
    // stub database call here....
    agent
      .get('/saved_messages')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('Subject Line')
        res.text.should.contain('first email')
        res.text.should.contain('second email')

        done()
      })
  })

})
