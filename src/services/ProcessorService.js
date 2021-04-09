/**
 * Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')

const MEMBER_PROFILE_URL_PREFIX = 'https://www.topcoder.com/members/'

/**
 * Process identity create entity message
 * @param {Object} message the kafka message
 */
async function handle (message) {
  // Check if the user already exists in u-bahn
  // If yes, then proceed to only update the availability status
  // If not, then proceed to create the user and other associated data in u-bahn
  const ubahnToken = await helper.getUbahnToken()
  const userId = await helper.getUserId(message.payload.handle, ubahnToken)

  if (userId) {
    await processUpdate(message, userId, ubahnToken)
  } else {
    await processCreate(message, ubahnToken)
  }
}

handle.schema = {
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
      email: Joi.string().email().required(),
      country: Joi.object().keys({
        isoAlpha3Code: Joi.string().required()
      }).unknown(true).allow(null),
      active: Joi.boolean()
    }).required().unknown(true)
  }).required().unknown(true)
}

/**
 * Create the user and associated data in u-bahn
 * @param {Object} message the kafka message
 * @param {String} ubahnToken the auth token
 */
async function processCreate (message, ubahnToken) {
  const organizationId = await helper.getOrganizationId(ubahnToken)
  const attributes = await helper.getAttributes(ubahnToken)
  const location = message.payload.country.isoAlpha3Code

  const userId = await helper.createUser(_.pick(message.payload, 'handle', 'firstName', 'lastName'), ubahnToken)
  logger.info(`user: ${message.payload.handle} created`)
  helper.sleep()
  await helper.createExternalProfile(userId, { organizationId, uri: `${MEMBER_PROFILE_URL_PREFIX}${message.payload.handle}`, externalId: message.payload.id, isInactive: false }, ubahnToken)
  logger.info(`external profile: ${organizationId} created`)
  helper.sleep()
  await helper.createUserAttribute(userId, _.get(attributes, 'isAvailable'), message.payload.active.toString(), ubahnToken)
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

  // Custom attribute. May or may not exist
  if (_.get(attributes, 'email')) {
    helper.sleep()
    await helper.createUserAttribute(userId, _.get(attributes, 'email'), message.payload.email, ubahnToken)
    logger.info('user attribute: email created')
  }
}

/**
 * Updates the user's availability status in u-bahn
 * @param {Object} message the kafka message
 * @param {String} userId the u-bahn user id
 * @param {String} ubahnToken the auth token
 */
async function processUpdate (message, userId, ubahnToken) {
  const attributes = await helper.getAttributes(ubahnToken)

  await helper.updateUserAttribute(userId, _.get(attributes, 'isAvailable'), message.payload.active.toString(), ubahnToken)
  logger.info('user attribute: isAvailable updated')
}

module.exports = {
  handle
}

logger.buildService(module.exports)
