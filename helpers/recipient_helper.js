const Download = require('../models/download')
const Email = require('../models/email')
const Sms = require('../models/sms')
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
   * get SMS messages from TMS
   * returns SMS message objects translated to TMSJS
   * for example, the TMS API exposes an attribute called "id"
   * that TMSJS refers to as "messageId"
   */
  getSmsMessageData: function(engine) {
    return engine
      .get('/messages/sms')
      .then(function(result){
        return result.data.map((sms) => {
          return { messageId: sms.id, body: sms.body, date: sms.created_at }
        })
      })
  },

  /**
   * externally called function
   * * gets all email messages for an account
   * * persists all email messages
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
      .then(function(recipientData) {
        const dl = new Download({date: new Date()})
        dl.save(err => {
          if (err) {
            module.exports.log('ERROR SAVING DOWNLOAD DATA', err)
          }
        })
        return recipientData
      })
  },

  /**
   * externally called function
   * * gets all sms messages for an account
   * * persists all sms messages
   * * persists all recipients for these messages
   */
  populateSmsRecipients: function(engine) {
    return module.exports.getSmsMessageData(engine)
      .then(function(messageData) {
        module.exports.saveSmsMessages(messageData)
        return messageData
      })
      .then(function(messageData) {
        return module.exports.saveSmsMessageRecipients(engine, messageData)
      })
      .then(function(recipientData) {
        const dl = new Download({date: new Date()})
        dl.save(err => {
          if (err) {
            module.exports.log('ERROR SAVING DOWNLOAD DATA', err)
          }
        })
        return recipientData
      })
  },

  /** get email recipients from TMS */
  getGetRecipientPromises: function (engine, messageData) {
    return messageData.map((message) => {
      return engine
        .get('/messages/email/' + message.messageId + '/recipients')
    })
  },

  /** get sms recipients from TMS */
  getGetSmsRecipientPromises: function (engine, messageData) {
    return messageData.map((message) => {
      return engine
        .get('/messages/sms/' + message.messageId + '/recipients')
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
          module.exports.log('ERROR SAVING MESSAGE ' + query.messageId, err)
        }
      })
    })
  },

  /**
   * persist SMS messages
   * if record exists, update it; if not, insert it
   */
  getSaveSmsMessagePromises: function (messages) {
    return [].concat(...messages).map((message) => {
      const query = {messageId: message.messageId}
      const data = Object.assign({}, query, {
        body: message.body,
        date: message.date
      })

      return Sms.update(query, data, {upsert: true}, function(err) {
        if (err) {
          module.exports.log('ERROR SAVING MESSAGE ' + query.messageId, err)
        }
      })
    })
  },

  /** read messages from database */
  readMessages: function() {
    return Email.find(function(err, messages){
      if (err) {
        module.exports.log('error retrieving messages from database', err)
      }
      return messages
    })
  },

  /** read latest download date from database */
  readLastDownloadDate: function() {
    return Download.findOne({})
      .sort({date: 'desc'})
      .exec((err, date) => {
        if (err) {
          module.exports.log('ERROR FINDING DATE:', err)
        }
        return date
      })
  },

  /**
   * persist email recipients
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

  /**
   * persist SMS recipients
   * if record exists, update it; if not, insert it
   */
  getSaveSmsRecipientPromises: function (recipients) {
    return [].concat(...recipients).map((recipient) => {
      const messageId = recipient._links.sms_message.split('/')[3]
      const query = {messageId: messageId, phone: recipient.phone}
      const data = Object.assign({}, query)

      return Recipient.update(query, data, {upsert: true}, function(err) {
        if (err) {
          module.exports.log('ERROR SAVING RECIPIENT ' + messageId + ':' + recipient.phone, err)
        }
      })
    })
  },

  // need to test cover
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

  // need to test cover
  saveSmsMessageRecipients: function (engine, messageData) {
    const getRecipientPromises = module.exports.getGetSmsRecipientPromises(engine, messageData)
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
        const savePromises = module.exports.getSaveSmsRecipientPromises(rdata)
        return module.exports.executePromises(savePromises)
      })
  },

  saveMessages: function (messageData) {
    const messagePromises = module.exports.getSaveMessagePromises(messageData)
    return module.exports.executePromises(messagePromises)
  },

  saveSmsMessages: function (messageData) {
    const messagePromises = module.exports.getSaveSmsMessagePromises(messageData)
    return module.exports.executePromises(messagePromises)
  },

  findRecipients: function (email) {
    return Recipient.find({email: { $regex: '.*' + email + '.*' }})
      .sort({messageId: 'asc', email: 'asc'})
      .exec((err, recipients) => {
        if (err) {
          module.exports.log('ERROR FINDING RECIPIENTS:' + email, err)
        }
        return recipients
      })
  },

  findMessage: function (messageId) {
    return Email.findOne({messageId: messageId})
      .exec((err, message) => {
        if (err) {
          module.exports.log('ERROR FINDING MESSAGE: ' + messageId, err)
        }
        return message
      })
  },

  decorateRecipients: function(recipients) {
    return recipients.map((recipient) => {
      return module.exports.findMessage(recipient.messageId)
        .then(message => {
          return Object.assign({email: recipient.email, messageId: recipient.messageId}, {date: message.date, subject: message.subject})
        })
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
