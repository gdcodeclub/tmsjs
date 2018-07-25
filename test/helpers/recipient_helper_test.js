process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'
process.env.DATABASEURL = 'mongodb://localhost/test_tmsjs'

const mongoose = require('mongoose');
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
    if (mongoose.connection.db) {
      console.log('Already have a db connection')
    } else {
      mongoose.connect('mongodb://localhost/testDatabase');
    }
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error'));
    db.once('open', function() {
      console.log('We are connected to test database!');
    });

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

  // afterEach(function(){
  //   mongoose.connection.db.dropDatabase(function(){
  //     mongoose.connection.close();
  //   });
  // });

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

  it ('should read last download date (readLastDownloadDate)', () => {
    const date = new Date()
    const rec = new Download({
      date: date
    })
    const savePromise = rec.save(err => {
      if (err) {
        recipientHelper.log('ERROR SAVING ' + date, err)
      }
    })

    return savePromise
      .then(res => {
        res.date.toString().should.equal(rec.date.toString())
      })
      .then(() => {
        return recipientHelper.readLastDownloadDate()
          .then(dlDate => {
            dlDate.date.toString().should.equal(rec.date.toString())
          })
      })
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
      .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/email/1', 'self': '/messages/email/1/recipients/11111'}},
                   {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/email/1', 'self': '/messages/email/1/recipients/22222'}}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/email/2/recipients')
      .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/email/2', 'self': '/messages/email/2/recipients/33333'}},
                   {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/email/2', 'self': '/messages/email/2/recipients/44444'}}])

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

  it ('should get SMS recipients with message id (getGetSmsRecipientPromises)', (done) => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/sms/1/recipients')
      .reply(200, [{'phone': '16515551212', '_links':{'sms_message':'/messages/sms/1', 'self': '/messages/sms/1/recipients/11111'}},
                   {'phone': '16515557878', '_links':{'sms_message':'/messages/sms/1', 'self': '/messages/sms/1/recipients/22222'}}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/sms/2/recipients')
      .reply(200, [{'email': '16515551213', '_links':{'sms_message':'/messages/sms/2', 'self': '/messages/sms/2/recipients/33333'}},
                   {'email': '16515557879', '_links':{'sms_message':'/messages/sms/2', 'self': '/messages/sms/2/recipients/44444'}}])

    const promises = recipientHelper.getGetSmsRecipientPromises(engine, [{messageId: 1, body: 'body1', date: '2017-01-30T17:45:27Z'},
                                                                         {messageId: 2, body: 'body2', date: '2017-02-30T17:45:27Z'}])

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
    const recipients = [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/email/1', 'self': '/messages/email/1/recipients/11111'}},
                        {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/email/1', 'self': '/messages/email/1//recipients/22222'}}]

    const promises = recipientHelper.getSaveRecipientPromises(recipients)
    promises.should.have.lengthOf(2)

    done()
  })

  it ('should get save SMS messages (getSaveSmsMessagePromises)', (done) => {
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

  it ('should save SMS messages (saveSmsMessages)', () => {
    const messages = [{'body':'message1', 'id':1000, 'created_at':'2017-01-30T17:45:27Z'},
                      {'body':'message2', 'id':1001, 'created_at':'2017-09-29T08:17:11Z'}]
    const promises = recipientHelper.saveSmsMessages(messages)
    return promises
      .then((res) => {
        res.should.have.lengthOf(2)
      })
  })

  it ('should read email records from database (readMessages)', () => {
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
            message.date.toString().should.equal(rec.date.toString())
            message.subject.should.equal(rec.subject)
            message.messageId.should.equal(rec.messageId)
          })
      })
  })

  it ('should sort email records from database (readMessages)', () => {
    const rec0 = new Email({
      subject: 'First mailing',
      date: (new Date() - 400000).toString(),
      messageId: 1
    })

    const rec1 = new Email({
      subject: 'A fine mailing',
      date: new Date().toString(),
      messageId: 1001
    })

    const rec2 = new Email({
      subject: 'An earlier fine mailing',
      date: (new Date() - 100000).toString(),
      messageId: 1000
    })

    const savePromise1 = rec1.save(err => {
      if (err) {
        recipientHelper.log('ERROR SAVING ' + rec1, err)
      }
    })

    const savePromise2 = rec2.save(err => {
      if (err) {
        recipientHelper.log('ERROR SAVING ' + rec2, err)
      }
    })

    const savePromise0 = rec0.save(err => {
      if (err) {
        recipientHelper.log('ERROR SAVING ' + rec0, err)
      }
    })

    return Promise.all([savePromise0, savePromise2, savePromise1])
      .then(res => {
        res.length.should.equal(3)
      })
      .then(() => {
        return recipientHelper.readMessages()
          .then(messages => {
            messages[0].subject.should.equal('A fine mailing')
            messages[1].subject.should.equal('An earlier fine mailing')
            messages[2].subject.should.equal('First mailing')
          })
      })
  })

  it ('should read SMS records from database (readSmsMessages)', () => {
    const date = new Date().toString()
    const rec = new Sms({
      body: 'A fine sms',
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
        return recipientHelper.readSmsMessages()
          .then(messages => {
            const message = messages[messages.length - 1]
            message.date.toString().should.equal(rec.date.toString())
            message.body.should.equal(rec.body)
            message.messageId.should.equal(rec.messageId)
          })
      })
  })

  describe ('SMS records from database (readSmsMessages)', () => {
    beforeEach (() => {
      const rec0 = new Sms({
        body: 'First sms',
        date: (new Date - 100000).toString(),
        messageId: 2
      })

      const savePromise0 = rec0.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + date, err)
        }
      })

      const rec1 = new Sms({
        body: 'A fine sms',
        date: (new Date() - 10000).toString(),
        messageId: 3
      })

      const savePromise1 = rec1.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + date, err)
        }
      })

      const rec2 = new Sms({
        body: 'A future fine sms',
        date: new Date().toString(),
        messageId: 4
      })

      const savePromise2 = rec2.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + date, err)
        }
      })

      const rec3 = new Sms({
        body: 'Firster sms',
        date: (new Date() - 500000).toString(),
        messageId: 1
      })

      const savePromise3 = rec3.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + date, err)
        }
      })

      return Promise.all([savePromise3, savePromise0, savePromise2, savePromise1])
        .then(res => {
          res.length.should.equal(4)
        })
    })

    it ('default (desc)', () => {
      return recipientHelper.readSmsMessages()
        .then(messages => {
          messages[0].body.should.equal('A future fine sms')
          messages[1].body.should.equal('A fine sms')
          messages[2].body.should.equal('First sms')
          messages[3].body.should.equal('Firster sms')
        })
    })

    it ('desc', () => {
      return recipientHelper.readSmsMessages('DESC')
        .then(messages => {
          messages[0].body.should.equal('A future fine sms')
          messages[1].body.should.equal('A fine sms')
          messages[2].body.should.equal('First sms')
          messages[3].body.should.equal('Firster sms')
        })
    })

    it ('asc', () => {
      return recipientHelper.readSmsMessages('ASC')
        .then(messages => {
          messages[0].body.should.equal('Firster sms')
          messages[1].body.should.equal('First sms')
          messages[2].body.should.equal('A fine sms')
          messages[3].body.should.equal('A future fine sms')
        })
    })
  })

  describe('email recipient search', () => {
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
        email: 'first@example.com',
        recipientId: 2001
      })
      const saveRecipientPromise1 = recipient1.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      const recipient2 = new Recipient({
        messageId: 1001,
        email: 'second@example.com',
        recipientId: 2002
      })
      const saveRecipientPromise2 = recipient2.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      const recipient3 = new Recipient({
        messageId: 1002,
        email: 'second@example.com',
        recipientId: 2003
      })
      const saveRecipientPromise3 = recipient3.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      return Promise.all([saveEmailPromise1, saveEmailPromise2, saveRecipientPromise1, saveRecipientPromise2, saveRecipientPromise3])
    })

    it ('should search for email recipients (findRecipients)', () => {
      return recipientHelper.findRecipients('first@example.com')
        .then((records) => {
          records.should.have.lengthOf(1)

          records[0].messageId.should.equal('1001')
          records[0].email.should.equal('first@example.com')
          records[0].recipientId.should.equal('2001')
        })
    })

    it ('should search for email recipients wildcard', () => {
      return recipientHelper.findRecipients('example')
        .then((records) => {
          records.should.have.lengthOf(3)

          records[0].messageId.should.equal('1001')
          records[0].email.should.equal('first@example.com')
          records[0].recipientId.should.equal('2001')
          records[1].messageId.should.equal('1001')
          records[1].email.should.equal('second@example.com')
          records[1].recipientId.should.equal('2002')
          records[2].messageId.should.equal('1002')
          records[2].email.should.equal('second@example.com')
          records[2].recipientId.should.equal('2003')
        })
    })

    it ('should decorate email recipients', () => {
      const decorated = recipientHelper.decorateRecipients(
        [{ _id: '5a198c1ac812633725a5bbb9',
          messageId: '1001',
          email: 'second@example.com',
          recipientId: '2001',
          __v: 0 }])
      return Promise.all(decorated)
        .then(res => {
          res[0].messageId.should.equal('1001')
          res[0].email.should.equal('second@example.com')
          res[0].subject.should.equal('A fine mailing')
          res[0].recipientId.should.equal('2001')
          res[0].date.should.not.be.null
        })

    })
  })

  describe('SMS recipient search', () => {
    beforeEach(() => {
      const sms1 = new Sms({
        body: 'A fine message',
        date: new Date().toString(),
        messageId: 1001
      })
      const saveSmsPromise1 = sms1.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + sms1.body, err)
        }
      })

      const sms2 = new Sms({
        body: 'A better message',
        date: new Date().toString(),
        messageId: 1002
      })
      const saveSmsPromise2 = sms2.save(err => {
        if (err) {
          recipientHelper.log('ERROR SAVING ' + email2.body, err)
        }
      })

      const recipient1 = new Recipient({
        messageId: 1001,
        phone: '16515551212',
        recipientId: 2001
      })
      const saveRecipientPromise1 = recipient1.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      const recipient2 = new Recipient({
        messageId: 1001,
        phone: '16515557878',
        recipientId: 2002
      })
      const saveRecipientPromise2 = recipient2.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      const recipient3 = new Recipient({
        messageId: 1002,
        phone: '16515557878',
        recipientId: 2003
      })
      const saveRecipientPromise3 = recipient3.save(err => {
        if(err) {
          recipientHelper.log('ERROR SAVING RECIPIENT', err)
        }
      })

      return Promise.all([saveSmsPromise1, saveSmsPromise2, saveRecipientPromise1, saveRecipientPromise2, saveRecipientPromise3])
    })

    it ('should search for sms recipients (findSmsRecipients)', () => {
      return recipientHelper.findSmsRecipients('16515551212')
        .then((records) => {
          records.should.have.lengthOf(1)

          records[0].messageId.should.equal('1001')
          records[0].phone.should.equal('16515551212')
          records[0].recipientId.should.equal('2001')
        })
    })

    it ('should search for sms recipients wildcard', () => {
      return recipientHelper.findSmsRecipients('651')
        .then((records) => {
          records.should.have.lengthOf(3)

          records[0].messageId.should.equal('1001')
          records[0].phone.should.equal('16515551212')
          records[0].recipientId.should.equal('2001')
          records[1].messageId.should.equal('1001')
          records[1].phone.should.equal('16515557878')
          records[1].recipientId.should.equal('2002')
          records[2].messageId.should.equal('1002')
          records[2].phone.should.equal('16515557878')
          records[2].recipientId.should.equal('2003')
        })
    })

    it ('should decorate sms recipients', () => {
      const decorated = recipientHelper.decorateSmsRecipients(
        [{ _id: '5a198c1ac812633725a5bbb9',
          messageId: '1001',
          phone: '16515557878',
          recipientId: '2001',
          __v: 0 }])
      return Promise.all(decorated)
        .then(res => {
          res[0].messageId.should.equal('1001')
          res[0].phone.should.equal('16515557878')
          res[0].body.should.equal('A fine message')
          res[0].date.should.not.be.null
          res[0].recipientId.should.equal('2001')
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
      .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/email/1', 'self': '/messages/email/1/recipients/11111'}},
                   {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/email/1', 'self': '/messages/email/1/recipients/22222'}}])
    const third = nock(process.env.TMS_URL)
      .get('/messages/email/2/recipients')
      .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/email/2', 'self': '/messages/email/2/recipients/33333'}},
                   {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/email/2', 'self': '/messages/email/2/recipients/44444'}}])
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
          recipient.email.should.eq('r.fong@sink.granicus.com')
          recipient.recipientId.should.eq('11111')
        })
      })
      .then(() => {
        return Recipient.findOne({'email': 'e.ebbesen@sink.granicus.com'}, function(err, recipient) {
          recipient.messageId.should.eq('1')
          recipient.email.should.eq('e.ebbesen@sink.granicus.com')
          recipient.recipientId.should.eq('22222')

        })
      })
      .then(() => {
        return Recipient.findOne({'email': 'r.fong2@sink.granicus.com'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
          recipient.email.should.eq('r.fong2@sink.granicus.com')
          recipient.recipientId.should.eq('33333')
        })
      })
      .then(() => {
        return Recipient.findOne({'email': 'e.ebbesen2@sink.granicus.com'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
          recipient.email.should.eq('e.ebbesen2@sink.granicus.com')
          recipient.recipientId.should.eq('44444')
        })
      })
      .then(() => {
        return Download.findOne({}, function(err, dl) {
          dl.should.not.be.null
        })
      })
  })

  // test unwieldy, but helpful during development
  it ('should populate sms messages and recipients (populateSmsRecipients)', () => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/sms')
      .reply(200, [{'id': 1, 'body':'sms1', 'created_at':'2017-01-30T17:45:27Z'},
                   {'id': 2, 'body':'sms2', 'created_at':'2017-02-30T17:45:27Z'}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/sms/1/recipients')
      .reply(200, [{'phone': '16515551212', '_links':{'sms_message':'/messages/sms/1', 'self': '/messages/sms/1/recipients/11111'}},
                   {'phone': '16515557878', '_links':{'sms_message':'/messages/sms/1', 'self': '/messages/sms/1/recipients/22222'}}])
    const third = nock(process.env.TMS_URL)
      .get('/messages/sms/2/recipients')
      .reply(200, [{'phone': '16515551213', '_links':{'sms_message':'/messages/sms/2', 'self': '/messages/sms/2/recipients/33333'}},
                   {'phone': '16515557879', '_links':{'sms_message':'/messages/sms/2', 'self': '/messages/sms/2/recipients/44444'}}])
    const promise = recipientHelper.populateSmsRecipients(engine)

    return promise
      .then(recipients => {
        recipients.length.should.equal(4)

        first.isDone().should.be.true
        second.isDone().should.be.true
        third.isDone().should.be.true
      })
      .then(() => {
        return Sms.findOne({'messageId': '1'}, function(err, message) {
          message.body.should.eq('sms1')
        })
      })
      .then(() => {
        return Sms.findOne({'messageId': '2'}, function(err, message) {
          message.body.should.eq('sms2')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515551212'}, function(err, recipient) {
          recipient.messageId.should.eq('1')
          recipient.phone.should.eq('16515551212')
          recipient.recipientId.should.eq('11111')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515557878'}, function(err, recipient) {
          recipient.messageId.should.eq('1')
          recipient.phone.should.eq('16515557878')
          recipient.recipientId.should.eq('22222')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515551213'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
          recipient.phone.should.eq('16515551213')
          recipient.recipientId.should.eq('33333')
        })
      })
      .then(() => {
        return Recipient.findOne({'phone': '16515557879'}, function(err, recipient) {
          recipient.messageId.should.eq('2')
          recipient.phone.should.eq('16515557879')
          recipient.recipientId.should.eq('44444')
        })
      })
      .then(() => {
        return Download.findOne({}, function(err, dl) {
          dl.should.not.be.null
        })
      })
  })
})
