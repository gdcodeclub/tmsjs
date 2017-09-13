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
  getMessageIds: function(engine) {
  return engine
    .get('/messages/email')
    .then(function(result){
      return result.data.map((email) => {
        return email.id
      })
    })
  },

  /**
   * externally called function
   * * gets all messages for an account
   * * persists all recipients for these messages
   */
  populateRecipients: function(engine) {
    return module.exports.getMessageIds(engine)
      .then(function(messageIds) {
        return module.exports.saveMessageRecipients(engine, messageIds)
      })
  },

  /** get recipients from TMS */
  getGetRecipientPromises: function (engine, messageIds) {
    return messageIds.map((messageId) => {
      return engine
        .get('/messages/email/' + messageId + '/recipients')
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

  saveMessageRecipients: function (engine, messageIds) {
    const recipientPromises = module.exports.getGetRecipientPromises(engine, messageIds)
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
