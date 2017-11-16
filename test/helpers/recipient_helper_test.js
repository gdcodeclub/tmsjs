process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'

const chai = require('chai')
const chaiHttp = require('chai-http')
var chaiAsPromised = require("chai-as-promised");
const nock = require('nock')
const should = chai.should()
const sinon = require('sinon')
const Email = require('../../models/email')
const Recipient = require('../../models/recipient')
const recipientHelper = require('../../helpers/recipient_helper')
const axios = require('axios')
const engine = axios.create({
  baseURL: process.env.TMS_URL,
  headers: {'X-Auth-Token': process.env.TMS_KEY}})
const mongoose = require('mongoose')

var mockEmail // mocking

chai.use(chaiHttp);
chai.use(chaiAsPromised);

describe('recipient_helper', () => {
  it ('should execute promises (executePromises)', () => {
    const p1 = new Promise(function(resolve, reject) {
      resolve("done1")
    })
    const p2 = new Promise(function(resolve, reject) {
      resolve("done2")
    })
    const p3 = new Promise(function(resolve, reject) {
      resolve("done3")
    })

    return recipientHelper.executePromises([p1, p2, p3])
      .should.become(['done1', 'done2', 'done3'])
  })

  it('should get message ids (getMessageData)', () => {
    nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'id': 1, 'subject':'subj1'}, {'id': 2, 'subject':'subj2'}])

    return recipientHelper
      .getMessageData(engine)
      .should.become([{id: 1, subject: 'subj1'},{id: 2, subject: 'subj2'}])
  })

  it('should get recipients with message id (getGetRecipientPromises)', (done) => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/email/1/recipients')
      .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/11111'}}, {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/22222'}}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/email/2/recipients')
      .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/33333'}}, {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/44444'}}])

    const promises = recipientHelper.getGetRecipientPromises(engine, [{id: 1, subject: 'subj1'},{id: 2, subject: 'subj2'}])
    promises.should.have.lengthOf(2)

    done()
  })

  it('should get save recipients (getSaveRecipientPromises)', (done) => {
    const recipients = [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/11111'}}, {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/22222'}}]

    const promises = recipientHelper.getSaveRecipientPromises(recipients)
    promises.should.have.lengthOf(2)

    done()
  })

  it('should get save messages (getSaveMessagePromises)', (done) => {
    const messages = [{'subject':'message1', 'id':1000, 'created_at':'2017-01-30T17:45:27Z'}, {'subject':'message2', 'id':1001, 'created_at':'2017-09-29T08:17:11Z'}]

    const promises = recipientHelper.getSaveMessagePromises(messages)
    promises.should.have.lengthOf(2)

    done()
  })

  it('should handle get save messages error (getSaveMessagePromises)', (done) => {
    should.throw(() => recipientHelper.getSaveMessagePromises(nil), ReferenceError)

    done()
  })


  it ('should save messages (saveMessages)', () => {
    const messages = [{'subject':'message1', 'id':1000, 'created_at':'2017-01-30T17:45:27Z'}, {'subject':'message2', 'id':1001, 'created_at':'2017-09-29T08:17:11Z'}]
    const promises = recipientHelper.saveMessages(messages)
    return promises
      .then((res) => {
        res.should.have.lengthOf(2)
      })
  })

  it ('should persist record', () => {
    const rec = new Recipient({
      email: 'blah'
    })

    return recipientHelper
      .persist(rec, ['recipient', 'eric'])
      .then((res) => {
        res.email.should.equal('blah')
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
        console.log('ERROR SAVING ' + date, err)
      }
    })

    return savePromise
      .then(res => {
        res.date.should.equal(rec.date)
      })
      .then(() => {
        return recipientHelper.readMessages(engine)
          .then(messages => {
            const message = messages[messages.length - 1]
            message.date.should.equal(rec.date)
            message.subject.should.equal(rec.subject)
            message.messageId.should.equal(rec.messageId)
          })
      })
  })

  // tests more than it should, but helpful during development
  it.only ('should populate messages and recipients (populateRecipients)', () => {
    const first = nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'id': 1, 'subject':'subj1'}, {'id': 2, 'subject':'subj2'}])
    const second = nock(process.env.TMS_URL)
      .get('/messages/email/1/recipients')
      .reply(200, [{'email': 'r.fong@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/11111'}}, {'email': 'e.ebbesen@sink.granicus.com', '_links':{'email_message':'/messages/1/recipient/22222'}}])
    const third = nock(process.env.TMS_URL)
      .get('/messages/email/2/recipients')
      .reply(200, [{'email': 'r.fong2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/33333'}}, {'email': 'e.ebbesen2@sink.granicus.com', '_links':{'email_message':'/messages/2/recipient/44444'}}])
    const promise = recipientHelper.populateRecipients(engine)

    return promise
      .then(recipients => {
        recipients.length.should.equal(4)
        recipients[0].messageId.should.equal('1')

        first.isDone().should.be.true
        second.isDone().should.be.true
        third.isDone().should.be.true
      })
      .then(() => {
        return Email.where('messageId', '1').findOne(function(err, message) {
          message.subject.should.eq('subj1')
        })
      })
      .then(() => {
        return Email.where('messageId', '2').findOne(function(err, message) {
          message.subject.should.eq('subj2')
        })
      })
      .then(() => {
        return Recipient.where('email', 'r.fong@sink.granicus.com').findOne(function(err, message) {
          message.messageId.should.eq('1')
        })
      })
      .then(() => {
        return Recipient.where('email', 'e.ebbesen@sink.granicus.com').findOne(function(err, message) {
          message.messageId.should.eq('1')
        })
      })
      .then(() => {
        return Recipient.where('email', 'r.fong2@sink.granicus.com').findOne(function(err, message) {
          message.messageId.should.eq('2')
        })
      })
      .then(() => {
        return Recipient.where('email', 'e.ebbesen2@sink.granicus.com').findOne(function(err, message) {
          message.messageId.should.eq('2')
        })
      })
  })
})
