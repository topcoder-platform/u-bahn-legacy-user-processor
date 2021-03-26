/**
 * Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const { config } = require('bluebird')

const ubahnToken = await helper.getUbahnToken()
const topcoderToken = await helper.getTopcoderToken()
const organizationId = await helper.getOrganizationId(ubahnToken)
const attributes = await helper.getAttributes(ubahnToken)
const skillProviderId = await helper.getSkillProviderId(ubahnToken)

/**
 * Process identity create entity message
 * @param {Object} message the kafka message
 */
async function processCreate(message) {

  const location = await helper.getMemberLocation(message.payload.handle, topcoderToken)
  const topic = _.get(message, 'payload.topic')

  let userId = null
  if ((topic === config.BACKENDJOB_USER_SYNC) || topic === config.BACKENDJOB_USER_SKILL_SYNC ) {
    userId = helper.getUser(message.payload.handle, ubahnToken)
  }
  if (!userId || (topic === config.IDENTITY_NOTIFICATION_CREATE)) {
    userId = await helper.createUser(_.pick(message.payload, 'handle', 'firstName', 'lastName'), ubahnToken)
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
  } else if (topic === config.BACKENDJOB_USER_SKILL_SYNC) {
    // topcode skill will not avaiable for recently created user
    const userSkills = await helper.getMemberSkills(message.payload.handle, topcoderToken)
    for (const userSkill of userSkills) {
      const skillId = await helper.getSkillId(skillProviderId, userSkill.name, ubahnToken)
      if (skillId) {
        helper.sleep()
        try {
          await helper.createUserSkill(userId, skillId, userSkill.score, ubahnToken)
          logger.info(`user skill: ${userSkill.name}:${userSkill.score} created`)
        } catch (error) {
          logger.error(`user skill instert error : ${error}`)
        }
      } else {
        logger.error(`Cannot find skill with name ${userSkill.name} and skill provider id ${skillProviderId} in u-bahn`)
      }
    }
  }
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
      lastName: Joi.string().required()
    }).required().unknown(true)
  }).required().unknown(true)
}

module.exports = {
  processCreate
}

logger.buildService(module.exports)
