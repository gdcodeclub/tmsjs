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

  /**
   * get messages from TMS
   * returns message objects translated to TMSJS
   * for example, the TMS API exposes an attribute called "id"
   * that TMSJS refers to as "messageId"
   */
  getMessageData: function(engine) {
  return engine
    .get('/messages/email')
    .then(function(result){
      return result.data.map((email) => {
        return { messageId: email.id, subject: email.subject, date: email.created_at }
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
        const res = module.exports.saveMessages(messageData)
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
        .get('/messages/email/' + message.messageId + '/recipients')
    })
  },

  /**
   * persist messages
   * if record exists, update it; if not, insert it
   */
  getSaveMessagePromises: function (messages) {
    return [].concat(...messages).map((message) => {
      const query = {messageId: message.messageId}
      const data = Object.assign({}, query, {
        subject: message.subject,
        date: message.date
      })

      return Email.update(query, data, {upsert: true}, function(err) {
        if (err) {
          module.exports.log('ERROR SAVING MESSAGE ' + messageId, err)
        }
      })
    })
  },

  /** read messages from database */
  readMessages: function(engine) {
    return Email.find(function(err, messages){
      if (err) {
        module.exports.log('error retrieving messages from database', err)
      }
      return messages
    })
  },

  /**
   * persist recipients
   * if record exists, update it; if not, insert it
   */
  getSaveRecipientPromises: function (recipients) {
    return [].concat(...recipients).map((recipient) => {
      const messageId = recipient._links.email_message.split('/')[3]
      const query = {messageId: messageId, email: recipient.email}
      const data = Object.assign({}, query)

      return Recipient.update(query, data, {upsert: true}, function(err) {
        if (err) {
          module.exports.log('ERROR SAVING RECIPIENT ' + messageId + ':' + recipient.email, err)
        }
      })
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

  findRecipients: function (email) {
    return Recipient.find({email: email}, (err, messages) => {
      if (err) {
        module.exports.log('ERROR FINDING RECIPIENT:' + email, err)
      }
      return messages
    })
  },

  /**
   * when running tests don't fill console with expected errors
   * for debugging you may want to modify this method temporarily to see full error
   */
  log: function(message, error) {
    if (process.env.TMS_URL == 'https://fake.tms.url.com') {
      console.log('error would have been logged -- see recipient_helper.log')
      return true
    }
    console.log(message, error)
  }

}
