// move these to test helper
process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'
process.env.DATABASEURL = 'mongodb://localhost/test_tmsjs'

const agent = require('supertest').agent(require('../../app'))
const chai = require('chai')
const chaiHttp = require('chai-http')
const nock = require('nock')
const should = chai.should()
const recipientHelper = require('../../helpers/recipient_helper')
const Email = require('../../models/email')
const Recipient = require('../../models/recipient')
const Sms = require('../../models/sms')

chai.use(chaiHttp)

describe('routes', () => {
  beforeEach(function() {
    return Email.remove({})
      .then(() => {
        return Sms.remove({})
          .then(() => {
            return Recipient.remove({})
          })
      })
  })

  it('should display home when no download date', (done) => {
    agent
      .get('/')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('Download data from Granicus')
        res.text.should.not.contain('Last download')
        done()
      })
  })

  it ('should show email message', (done) => {
    const messageData = {subject: 'retrieved message subject',
                         body: 'retrieved message body',
                         status: 'sending',
                         created_at: '2017-05-30T12:54:51Z',
                         recipient_counts: {'total': 3}}
    nock(process.env.TMS_URL)
      .get('/messages/email/1')
      .reply(200, messageData )

    agent
      .get('/e/1')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain(messageData.subject)
        res.text.should.contain(messageData.status)
        res.text.should.contain('total')

        nock.isDone().should.be.true
        done()
      })
  })

  it ('should show sms message', (done) => {
    const messageData = {body: 'retrieved message body',
                         status: 'sending',
                         created_at: '2017-05-30T12:54:51Z',
                         recipient_counts: {'total': 3}}
    nock(process.env.TMS_URL)
      .get('/messages/sms/1')
      .reply(200, messageData )

    agent
      .get('/s/1')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain(messageData.body)
        res.text.should.contain(messageData.status)
        res.text.should.contain('total')

        nock.isDone().should.be.true
        done()
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

  it ('should show email messages', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'subject': 'first email'}, {'subject': 'second email'}])

    agent
      .get('/m')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('TMS ID')
        res.text.should.contain('Date Sent')
        res.text.should.contain('Subject')
        res.text.should.contain('first email')
        res.text.should.contain('second email')
        res.text.should.contain('sort="d"')
        res.text.should.contain('/saved_messages?sort=a')

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
      .reply(200, [{body: 'welcome to our text'}, {'body': 'sms rulz'}])

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

  it('should show the new sms form', (done) => {
    agent
      .get('/news')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('Message Body')
        res.text.should.contain('Recipients')
        res.text.should.contain('Send Message')
        nock.isDone().should.be.true

        done()
      })
  })

  it ('should populate local store with email and sms recipient data', (done) => {
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

    const fourth = nock(process.env.TMS_URL)
      .get('/messages/sms')
      .reply(200, [{'id': 1, 'body': 'first sms', 'created_at':'2017-01-30T17:45:27Z' },
                   {'id': 2, 'body': 'second sms', 'created_at':'2017-02-30T17:45:27Z'}])
    const fifth = nock(process.env.TMS_URL)
      .get('/messages/sms/1/recipients')
      .reply(200, [{'phone': '16515551212', '_links':{'sms_message':'/messages/1/recipient/11111'}},
                   {'phone': '16515557878', '_links':{'sms_message':'/messages/1/recipient/22222'}}])
    const sixth = nock(process.env.TMS_URL)
      .get('/messages/sms/2/recipients')
      .reply(200, [{'phone': '16515551213', '_links':{'sms_message':'/messages/2/recipient/33333'}},
                   {'phone': '16515557879', '_links':{'sms_message':'/messages/2/recipient/44444'}}])

    agent
      .get('/slurpe')
      .then(res => {
        res.should.have.status(302)
        first.isDone().should.be.true
        second.isDone().should.be.true
        third.isDone().should.be.true
        fourth.isDone().should.be.true
        fifth.isDone().should.be.true
        sixth.isDone().should.be.true

        done()
      }).catch(function(err) {
        return done(err)
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

  it ('should populate local store with sms recipient data', () => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/sms')
      .reply(200, [{'id': 1, 'body': 'first sms', 'created_at':'2017-01-30T17:45:27Z' },
                   {'id': 2, 'body': 'second sms', 'created_at':'2017-02-30T17:45:27Z'}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/sms/1/recipients')
      .reply(200, [{'phone': '16515551212', '_links':{'sms_message':'/messages/1/recipient/11111'}},
                   {'phone': '16515557878', '_links':{'sms_message':'/messages/1/recipient/22222'}}])
    const third = nock(process.env.TMS_URL)
      .get('/messages/sms/2/recipients')
      .reply(200, [{'phone': '16515551213', '_links':{'sms_message':'/messages/2/recipient/33333'}},
                   {'phone': '16515557879', '_links':{'sms_message':'/messages/2/recipient/44444'}}])

    return agent
      .get('/slurps')
      .then(res => {
        res.should.have.status(302)
        first.isDone().should.be.true
        second.isDone().should.be.true
        third.isDone().should.be.true
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
      'id': 8675309,
      'subject': 'Hello!',
      'body': 'Hi!'
    }

    nock(process.env.TMS_URL)
      .post('/messages/email', mockData)
      .reply(200, mockResponse)

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

  it('should post sms message', (done) => {
    const mockData = {
      body: 'Hi!',
      recipients: [{phone:'16515551212'},{phone: '16515557878'}]
    }

    const mockResponse = {
      'id': 8675309,
      'body': 'Hi!'
    }

    nock(process.env.TMS_URL)
      .post('/messages/sms', mockData)
      .reply(200, mockResponse)

    const message = {
      body: 'Hi!',
      recipients: '16515551212,16515557878'
    }

    agent
      .post('/sms')
      .type('form')
      .send(message)
      .end((err, res) => {
        res.should.have.status(302)
        nock.isDone().should.be.true

        done(err)
      })
  })

  describe('saved_messages', () => {
    beforeEach(function() {
      const message = new Email({
        subject: 'Hello!',
        body: 'Hi!'
      })
      message.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + message + "\n" + err)
        }
      })
    })

    it ('should show saved email messages', (done) => {
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

    it ('should show saved email messages with sorting default desc', (done) => {
      agent
        .get('/saved_messages')
        .end((err, res) => {
          res.should.have.status(200)
          res.text.should.contain('sort="d"')
          res.text.should.contain('/saved_messages?sort=a')

          done()
        })
    })

    it ('should show saved email messages with sorting asc', (done) => {
      agent
        .get('/saved_messages?sort=a')
        .end((err, res) => {
          res.should.have.status(200)
          res.text.should.contain('sort="a"')
          res.text.should.contain('/saved_messages?sort=d')

          done()
        })
    })

    it ('should show saved email messages with sorting desc', (done) => {
      agent
        .get('/saved_messages?sort=d')
        .end((err, res) => {
          res.should.have.status(200)
          res.text.should.contain('sort="d"')
          res.text.should.contain('/saved_messages?sort=a')

          done()
        })
    })
  })

  it ('should show saved sms messages', (done) => {
    const sms = new Sms({
      body: 'Cool SMS!'
    })
    sms.save(err => {
      if (err) {
        recipientHelper.log('ERROR SAVING ' + sms + "\n" + err)
      }
    })

    agent
      .get('/saved_sms_messages')
      .end((err, res) => {
        res.should.have.status(200)
        res.text.should.contain('SMS Messages')
        res.text.should.contain('TMS ID')
        res.text.should.contain('Date Sent')
        res.text.should.contain('Body')
        res.text.should.contain('Cool SMS!')

        done()
      })
  })

  it ('should show email search page', (done) => {
    agent
      .get('/search_recipients')
      .end((req, res) => {
        res.should.have.status(200)
        res.text.should.contain('Search Email Recipients')

        done()
      })
  })

  it ('should show sms search page', (done) => {
    agent
      .get('/search_sms_recipients')
      .end((req, res) => {
        res.should.have.status(200)
        res.text.should.contain('Search SMS Recipients')

        done()
      })
  })

  describe ('search for recipients', () => {
    beforeEach(function() {
      const email1 = new Email({
        subject: 'A fine mailing',
        date: new Date().toString(),
        messageId: 1001
      })
      const saveEmailPromise1 = email1.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + email1.subject, err)
        }
      })

      const recipient1 = new Recipient({
        messageId: 1001,
        email: 'first@example.com'
      })
      const saveRecipientPromise1 = recipient1.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      const recipient2 = new Recipient({
        messageId: 1001,
        email: 'second@example.com'
      })
      const saveRecipientPromise2 = recipient2.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })


      const sms1 = new Sms({
        body: 'An SMS for the ages',
        date: new Date().toString(),
        messageId: 1003
      })
      const saveSmsPromise = sms1.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + email1.subject, err)
        }
      })

      const recipient3 = new Recipient({
        messageId: 1003,
        phone: '16515551212'
      })
      const saveSmsRecipientPromise = recipient3.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      return Promise.all([saveEmailPromise1, saveRecipientPromise1, saveRecipientPromise2, saveSmsPromise, saveSmsRecipientPromise])
    })

    it ('should search for sms recipients', (done) => {
      agent
        .get('/searchs')
        .type('form')
        .query({phone: '16515551212'})
        .end((err, res) => {
          res.should.have.status(200)
          res.text.should.contain('<td>1003</td>')

          done(err)
        })
    })

    it ('should search for email recipients', (done) => {
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

    it ('should search for email recipients when multiple returned', (done) => {
      agent
        .get('/searche')
        .type('form')
        .query({email: 'example.com'})
        .end((err, res) => {
          res.should.have.status(200)
          res.text.should.contain('Email Messages for first@example.com, second@example.com')
          res.text.should.contain('<td>1001</td>')
          res.text.should.contain('<td>first@example.com</td>')
          res.text.should.contain('<td>second@example.com</td>')

          done(err)
        })
    })
  })
})
