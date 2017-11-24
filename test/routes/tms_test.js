// move these to test helper
process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'
process.env.DATABASEURL = 'mongodb://localhost/test_tmsjs'

const agent = require('supertest').agent(require('../../app'))
const chai = require('chai')
const chaiHttp = require('chai-http')
const nock = require('nock')
const should = chai.should()
const sinon = require('sinon')
const recipientHelper = require('../../helpers/recipient_helper')
const Email = require('../../models/email')
const Recipient = require('../../models/recipient')

chai.use(chaiHttp);

describe('routes', () => {
  beforeEach(function() {
    return Email.remove({})
      .then(() => {
        return Recipient.remove({})
      })
  })

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
        res.text.should.contain('TMS ID')
        res.text.should.contain('Date Sent')
        res.text.should.contain('Subject')
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
        res.text.should.contain('Subject')
        res.text.should.contain('Message Body')
        res.text.should.contain('Recipients')
        res.text.should.contain('Send Message')
        nock.isDone().should.be.true

        done()
      })
  })

  it ('should populate local store with email recipient data', (done) => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'id': 1, 'subject': 'first email', 'created_at':'2017-01-30T17:45:27Z' },
                   {'id': 2, 'subject': 'second email', 'created_at':'2017-02-30T17:45:27Z'}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/email/1/recipients')
      .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/11111'}},
                   {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/22222'}}])
    const third = nock(process.env.TMS_URL)
      .get('/messages/email/2/recipients')
      .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/33333'}},
                   {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/44444'}}])

     agent
      .get('/slurpe')
      .then(res => {
        res.should.have.status(302)
        first.isDone().should.be.true
        second.isDone().should.be.true
        third.isDone().should.be.true

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
    const message = new Email({
      subject: 'Hello!',
      body: 'Hi!'
    })
    message.save(err => {
      if (err) {
        console.log('ERROR SAVING ' + message + "\n" + err)
      }
    })

    agent
      .get('/saved_messages')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('Email Messages')
        res.text.should.contain('TMS ID')
        res.text.should.contain('Date Sent')
        res.text.should.contain('Subject')
        res.text.should.contain('Hello!')

        done()
      })
  })

  it ('should show search page', (done) => {
    agent
      .get('/search_recipients')
      .end((req, res) => {
        res.should.have.status(200)
        res.text.should.contain('Search Recipients')

        done()
      })
  })

  describe ('search recipients', () => {
    beforeEach(function() {
      const email1 = new Email({
        subject: 'A fine mailing',
        date: new Date().toString(),
        messageId: 1001
      })
      const saveEmailPromise1 = email1.save(err => {
        if (err) {
          console.log('ERROR SAVING ' + date, err)
        }
      })

      const recipient1 = new Recipient({
        messageId: 1001,
        email: 'first@example.com'
      })
      const saveRecipientPromise1 = recipient1.save(err => {
        if(err) {
          console.log('ERROR SAVING RECIPIENT', err)
        }
      })

      return Promise.all([saveEmailPromise1, saveRecipientPromise1])
        .then(result => {
        })
        .then(() => {
          return recipientHelper.findRecipients('first@example.com')
        }).then((records) => {
           records.should.have.lengthOf(1)
        })

      return Promise.all([p1, p2])
        .then(result => {
          return true
        })
    })

    it ('should search for recipients', (done) => {
      agent
        .get('/searche')
        .type('form')
        .query({email: 'first@example.com'})
        .end((err, res) => {
          res.should.have.status(200)
          res.text.should.contain('<td>1001</td>')

          done(err)
        })
    })
  })
})
