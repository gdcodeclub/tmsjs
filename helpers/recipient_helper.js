const Email = require('../models/email')
const Recipient = require('../models/recipient')
module.exports = {

  /**
   * Execute collection of promises
   * move somewhere higher if reuse possible
   */
  executePromises: function(promises) {
    return Promise.all(promises)
      .then(result => {
        return result
      })
  },

  /** get message ids from TMS */
  getMessageData: function(engine) {
  return engine
    .get('/messages/email')
    .then(function(result){
      return result.data.map((email) => {
        return { id: email.id, subject: email.subject }
      })
    })
  },

  /**
   * externally called function
   * * gets all messages for an account
   * * persists all messages
   * * persists all recipients for these messages
   */
  populateRecipients: function(engine) {
    return module.exports.getMessageData(engine)
      .then(function(messageData) {
        module.exports.saveMessages(messageData)
        return messageData
      })
      .then(function(messageData) {
        return module.exports.saveMessageRecipients(engine, messageData)
      })
  },

  /** get recipients from TMS */
  getGetRecipientPromises: function (engine, messageData) {
    return messageData.map((message) => {
      return engine
        .get('/messages/email/' + message.id + '/recipients')
    })
  },

  /** persist messages */
  getSaveMessagePromises: function (messages) {
    return [].concat(...messages).map((message) => {
      const rec = new Email({
        messageId: message.id,
        subject: message.subject,
        date: message.created_at
      })
      return module.exports.persist(rec, ['MESSAGE', message.id])
    })
  },

  /** persist recipients */
  getSaveRecipientPromises: function (recipients) {
    return [].concat(...recipients).map((recipient) => {
      const rec = new Recipient({
        email: recipient.email,
        messageId: recipient._links.email_message.split('/').reverse()[0]
      })
      return module.exports.persist(rec, ['RECIPIENT', recipient.email])
    })
  },

  saveMessageRecipients: function (engine, messageData) {
    const getRecipientPromises = module.exports.getGetRecipientPromises(engine, messageData)
    return Promise.all(getRecipientPromises)
      .then(result => {
        return result
      })
      .then(function(recipients) {
        return recipients.map((rdata) => {
          return rdata.data
        })
      })
      .then(function(rdata) {
        const savePromises = module.exports.getSaveRecipientPromises(rdata)
        return module.exports.executePromises(savePromises)
      })
  },

  saveMessages: function (messageData) {
    const messagePromises = module.exports.getSaveMessagePromises(messageData)
    return module.exports.executePromises(messagePromises)
  },

  persist: function(rec, logData) {
    return rec.save(function(err) {
      if (err) {
        module.exports.log('ERROR SAVING ' + logData.join(' '), err)
      }
    })
  },

  // when running tests don't fill console with expected errors
  // for debugging you may want to modify this method temporarily to see full error
  log: function(message, error) {
    if (process.env.TMS_URL == 'https://fake.tms.url.com') {
      console.log('error would have been logged -- see recipient_helper.log')
      return true
    }
    console.log(message, error)
  }

}
