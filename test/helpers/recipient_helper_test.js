process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'
process.env.DATABASEURL = 'mongodb://localhost/test_tmsjs'

const chai = require('chai')
const chaiHttp = require('chai-http')
var chaiAsPromised = require('chai-as-promised')
const nock = require('nock')
const should = chai.should()
const Download = require('../../models/download')
const Email = require('../../models/email')
const Sms = require('../../models/sms')
const Recipient = require('../../models/recipient')
const recipientHelper = require('../../helpers/recipient_helper')
const axios = require('axios')
const engine = axios.create({
  baseURL: process.env.TMS_URL,
  headers: {'X-Auth-Token': process.env.TMS_KEY}})

chai.use(chaiHttp)
chai.use(chaiAsPromised)

describe ('recipient_helper', () => {
  beforeEach(function() {
    return Email.remove({})
      .then(() => {
        return Sms.remove({})
          .then(() => {
            return Recipient.remove({})
              .then(() => {
                return Download.remove({})
              })
          })
      })
  })

  it ('should execute promises (executePromises)', () => {
    const p1 = new Promise(function(resolve) {
      resolve('done1')
    })
    const p2 = new Promise(function(resolve) {
      resolve('done2')
    })
    const p3 = new Promise(function(resolve) {
      resolve('done3')
    })

    return recipientHelper.executePromises([p1, p2, p3])
      .should.become(['done1', 'done2', 'done3'])
  })

  it ('should get message ids (getMessageData)', () => {
    nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'id': 1, 'subject':'subj1', 'created_at':'2017-01-30T17:45:27Z'},
                   {'id': 2, 'subject':'subj2', 'created_at':'2017-02-30T17:45:27Z'}])

    return recipientHelper
      .getMessageData(engine)
      .should.become([{messageId: 1, subject: 'subj1', date: '2017-01-30T17:45:27Z'},
                      {messageId: 2, subject: 'subj2', date: '2017-02-30T17:45:27Z'}])
  })

  it ('should get SMS message ids (getSmsMessageData)', () => {
    nock(process.env.TMS_URL)
      .get('/messages/sms')
      .reply(200, [{'id': 1, 'body':'body1', 'created_at':'2017-01-30T17:45:27Z'},
                   {'id': 2, 'body':'body2', 'created_at':'2017-02-30T17:45:27Z'}])

    return recipientHelper
      .getSmsMessageData(engine)
      .should.become([{messageId: 1, body: 'body1', date: '2017-01-30T17:45:27Z'},
                      {messageId: 2, body: 'body2', date: '2017-02-30T17:45:27Z'}])
  })

  it ('should get recipients with message id (getGetRecipientPromises)', (done) => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/email/1/recipients')
      .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/11111'}},
                   {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/22222'}}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/email/2/recipients')
      .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/33333'}},
                   {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/44444'}}])

    const promises = recipientHelper.getGetRecipientPromises(engine, [{messageId: 1, subject: 'subj1', date: '2017-01-30T17:45:27Z'},
                                                                      {messageId: 2, subject: 'subj2', date: '2017-02-30T17:45:27Z'}])

    promises.should.have.lengthOf(2)
    Promise.all(promises)
      .then(() => {
        first.isDone().should.be.true
        second.isDone().should.be.true

        done()
      }).catch(function(err) {
        return done(err)
      })
  })

  it ('should get save recipients (getSaveRecipientPromises)', (done) => {
    const recipients = [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/11111'}},
                        {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/22222'}}]

    const promises = recipientHelper.getSaveRecipientPromises(recipients)
    promises.should.have.lengthOf(2)

    done()
  })

  it.only ('should get save SMS messages (getSaveSmsMessagePromises)', (done) => {
    const messages = [{'body':'message1', 'id':1000, 'created_at':'2017-01-30T17:45:27Z'},
                      {'body':'message2', 'id':1001, 'created_at':'2017-09-29T08:17:11Z'}]

    const promises = recipientHelper.getSaveSmsMessagePromises(messages)
    promises.should.have.lengthOf(2)

    done()
  })

  it ('should get save messages (getSaveMessagePromises)', (done) => {
    const messages = [{'subject':'message1', 'id':1000, 'created_at':'2017-01-30T17:45:27Z'},
                      {'subject':'message2', 'id':1001, 'created_at':'2017-09-29T08:17:11Z'}]

    const promises = recipientHelper.getSaveMessagePromises(messages)
    promises.should.have.lengthOf(2)

    done()
  })

  it('should handle get save messages error (getSaveMessagePromises)', (done) => {
    should.throw(() => recipienthelper.getSaveMessagePromises(blah), ReferenceError)

    done()
  })

  it ('should save messages (saveMessages)', () => {
    const messages = [{'subject':'message1', 'id':1000, 'created_at':'2017-01-30T17:45:27Z'},
                      {'subject':'message2', 'id':1001, 'created_at':'2017-09-29T08:17:11Z'}]
    const promises = recipientHelper.saveMessages(messages)
    return promises
      .then((res) => {
        res.should.have.lengthOf(2)
      })
  })

  it.only ('should save SMS messages (saveSmsMessages)', () => {
    const messages = [{'body':'message1', 'id':1000, 'created_at':'2017-01-30T17:45:27Z'},
                      {'body':'message2', 'id':1001, 'created_at':'2017-09-29T08:17:11Z'}]
    const promises = recipientHelper.saveSmsMessages(messages)
    return promises
      .then((res) => {
        res.should.have.lengthOf(2)
      })
  })

  it ('should read records from database (readMessages)', () => {
    const date = new Date().toString()
    const rec = new Email({
      subject: 'A fine mailing',
      date: date,
      messageId: 1001
    })
    const savePromise = rec.save(err => {
      if (err) {
        recipientHelper.log('ERROR SAVING ' + date, err)
      }
    })

    return savePromise
      .then(res => {
        res.date.should.equal(rec.date)
      })
      .then(() => {
        return recipientHelper.readMessages()
          .then(messages => {
            const message = messages[messages.length - 1]
            message.date.should.equal(rec.date)
            message.subject.should.equal(rec.subject)
            message.messageId.should.equal(rec.messageId)
          })
      })
  })

  describe('recipient search', () => {
    beforeEach(() => {
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

      const email2 = new Email({
        subject: 'A better mailing',
        date: new Date().toString(),
        messageId: 1002
      })
      const saveEmailPromise2 = email2.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + email2.subject, err)
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

      const recipient3 = new Recipient({
        messageId: 1002,
        email: 'second@example.com'
      })
      const saveRecipientPromise3 = recipient3.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      return Promise.all([saveEmailPromise1, saveEmailPromise2, saveRecipientPromise1, saveRecipientPromise2, saveRecipientPromise3])
    })

    it ('should search for recipients', () => {
      return recipientHelper.findRecipients('first@example.com')
        .then((records) => {
          records.should.have.lengthOf(1)

          records[0].messageId.should.equal('1001')
          records[0].email.should.equal('first@example.com')
        })
    })

    it ('should search for recipients wildcard', () => {
      return recipientHelper.findRecipients('example')
        .then((records) => {
          records.should.have.lengthOf(3)

          records[0].messageId.should.equal('1001')
          records[0].email.should.equal('first@example.com')
          records[1].messageId.should.equal('1001')
          records[1].email.should.equal('second@example.com')
          records[2].messageId.should.equal('1002')
          records[2].email.should.equal('second@example.com')
        })
    })

    it ('should decorate recipients', () => {
      const decorated = recipientHelper.decorateRecipients(
        [{ _id: '5a198c1ac812633725a5bbb9',
          messageId: '1001',
          email: 'second@example.com',
          __v: 0 }])
      return Promise.all(decorated)
        .then(res => {
          res[0].messageId.should.equal('1001')
          res[0].email.should.equal('second@example.com')
          res[0].subject.should.equal('A fine mailing')
          res[0].date.should.not.be.null
        })

    })
  })

  // test unwieldy, but helpful during development
  it ('should populate messages and recipients (populateRecipients)', () => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'id': 1, 'subject':'subj1', 'created_at':'2017-01-30T17:45:27Z'},
                   {'id': 2, 'subject':'subj2', 'created_at':'2017-02-30T17:45:27Z'}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/email/1/recipients')
      .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/email/1'}},
                   {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/email/1'}}])
    const third = nock(process.env.TMS_URL)
      .get('/messages/email/2/recipients')
      .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/email/2'}},
                   {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/email/2'}}])
    const promise = recipientHelper.populateRecipients(engine)

    return promise
      .then(recipients => {
        recipients.length.should.equal(4)

        first.isDone().should.be.true
        second.isDone().should.be.true
        third.isDone().should.be.true
      })
      .then(() => {
        return Email.findOne({'messageId': '1'}, function(err, message) {
          message.subject.should.eq('subj1')
        })
      })
      .then(() => {
        return Email.findOne({'messageId': '2'}, function(err, message) {
          message.subject.should.eq('subj2')
        })
      })
      .then(() => {
        return Recipient.findOne({'email': 'r.fong@sink.granicus.com'}, function(err, recipient) {
          recipient.messageId.should.eq('1')
        })
      })
      .then(() => {
        return Recipient.findOne({'email': 'e.ebbesen@sink.granicus.com'}, function(err, recipient) {
          recipient.messageId.should.eq('1')
        })
      })
      .then(() => {
        return Recipient.findOne({'email': 'r.fong2@sink.granicus.com'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
        })
      })
      .then(() => {
        return Recipient.findOne({'email': 'e.ebbesen2@sink.granicus.com'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
        })
      })
      .then(() => {
        return Download.findOne({}, function(err, dl) {
          dl.should.not.be.null
        })
      })
  })

  // test unwieldy, but helpful during development
  it.only ('should populate sms messages and recipients (populateSmsRecipients)', () => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/sms')
      .reply(200, [{'id': 1, 'body':'sms1', 'created_at':'2017-01-30T17:45:27Z'},
                   {'id': 2, 'body':'sms2', 'created_at':'2017-02-30T17:45:27Z'}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/sms/1/recipients')
      .reply(200, [{'sms': '16515551212', '_links':{'sms_message':'/messages/sms/1'}},
                   {'sms': '16515557878', '_links':{'sms_message':'/messages/sms/1'}}])
    const third = nock(process.env.TMS_URL)
      .get('/messages/sms/2/recipients')
      .reply(200, [{'sms': '16515551213', '_links':{'sms_message':'/messages/sms/2'}},
                   {'sms': '16515557879', '_links':{'sms_message':'/messages/sms/2'}}])
    const promise = recipientHelper.populateSmsRecipients(engine)

    return promise
      .then(recipients => {
        recipients.length.should.equal(4)

        first.isDone().should.be.true
        second.isDone().should.be.true
        third.isDone().should.be.true
      })
      .then(() => {
        return Email.findOne({'messageId': '1'}, function(err, message) {
          message.subject.should.eq('sms1')
        })
      })
      .then(() => {
        return Email.findOne({'messageId': '2'}, function(err, message) {
          message.subject.should.eq('sms2')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515551212'}, function(err, recipient) {
          recipient.messageId.should.eq('1')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515557878'}, function(err, recipient) {
          recipient.messageId.should.eq('1')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515551213'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515557879'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
        })
      })
      .then(() => {
        return Download.findOne({}, function(err, dl) {
          dl.should.not.be.null
        })
      })
  })
})
