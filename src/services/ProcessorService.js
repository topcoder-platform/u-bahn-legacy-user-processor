/**
 * Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')

/**
 * Process identity create entity message
 * @param {Object} message the kafka message
 */
async function processCreate (message) {
  const ubahnToken = await helper.getUbahnToken()
  const organizationId = await helper.getOrganizationId(ubahnToken)
  const attributes = await helper.getAttributes(ubahnToken)
  const location = message.payload.country.isoAlpha3Code

  const userId = await helper.createUser(_.pick(message.payload, 'handle', 'firstName', 'lastName'), ubahnToken)
  logger.info(`user: ${message.payload.handle} created`)
  helper.sleep()
  await helper.createExternalProfile(userId, { organizationId, uri: 'uri', externalId: message.payload.id, isInactive: false }, ubahnToken)
  logger.info(`external profile: ${organizationId} created`)
  helper.sleep()
  await helper.createUserAttribute(userId, _.get(attributes, 'isAvailable'), 'true', ubahnToken)
  logger.info('user attribute: isAvailable created')
  helper.sleep()
  await helper.createUserAttribute(userId, _.get(attributes, 'company'), 'Topcoder', ubahnToken)
  logger.info('user attribute: company created')
  helper.sleep()
  await helper.createUserAttribute(userId, _.get(attributes, 'title'), 'Member', ubahnToken)
  logger.info('user attribute: title created')
  helper.sleep()
  await helper.createUserAttribute(userId, _.get(attributes, 'location'), location, ubahnToken)
  logger.info('user attribute: location created')
}

processCreate.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      id: Joi.string().required(),
      handle: Joi.string().required(),
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      country: Joi.object().keys({
        isoAlpha3Code: Joi.string().required()
      }).required().unknown(true)
    }).required().unknown(true)
  }).required().unknown(true)
}

module.exports = {
  processCreate
}

logger.buildService(module.exports)
