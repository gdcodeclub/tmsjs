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
   * * persists all recipients for these messages
   */
  populateRecipients: function(engine) {
    return module.exports.getMessageData(engine)
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

  /** persist recipients */
  getSaveRecipientPromises: function (recipients) {
    return [].concat(...recipients).map((recipient) => {
      const rec = new Recipient({
        email: recipient.email,
        messageId: recipient._links.email_message.split('/').reverse()[0]
      })
      return rec.save(function(err) {
        if (err) {
          console.log('ERROR SAVING', err)
        }
      })
    })
  },

  saveMessageRecipients: function (engine, messageData) {
    const recipientPromises = module.exports.getGetRecipientPromises(engine, messageData)
    return Promise.all(recipientPromises)
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
  }

}
