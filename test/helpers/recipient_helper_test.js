process.env.TMS_URL = 'https://fake.tms.url.com'
process.env.TMS_KEY = 'hU5Hn0w'

const chai = require('chai')
const chaiHttp = require('chai-http')
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

chai.use(chaiHttp);

describe('recipient_helper', () => {
  it ('should execute promises (executePromises)', (done) => {
    const p1 = new Promise(function(resolve, reject) {
      resolve("done1")
    })
    const p2 = new Promise(function(resolve, reject) {
      resolve("done2")
    })
    const p3 = new Promise(function(resolve, reject) {
      resolve("done3")
    })

    recipientHelper
      .executePromises([p1, p2, p3])
      .then(res => {
        res.should.deep.equal(['done1', 'done2', 'done3'])

        done()
      }).catch(err => {
        done(err)
      })
  })

  it('should get message ids (getMessageData)', (done) => {
    nock(process.env.TMS_URL)
      .get('/messages/email')
      .reply(200, [{'id': 1, 'subject':'subj1'}, {'id': 2, 'subject':'subj2'}])

    recipientHelper
      .getMessageData(engine)
      .then(res => {
        res.should.deep.equal([{id: 1, subject: 'subj1'},{id: 2, subject: 'subj2'}])
        nock.isDone().should.be.true

        done()
      }).catch(err => {
        done(err)
      })
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
})
