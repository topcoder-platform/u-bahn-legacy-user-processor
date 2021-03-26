/**
 * Processor Service
 */

const _ = require('lodash')
const Joi = require('@hapi/joi')
const logger = require('../common/logger')
const helper = require('../common/helper')
const config = require('config')

let ubahnToken
let topcoderToken
let organizationId
let attributes
let skillProviderId

async function init() {
  ubahnToken = await helper.getUbahnToken()
  topcoderToken = await helper.getTopcoderToken()
  organizationId = await helper.getOrganizationId(ubahnToken)
  attributes = await helper.getAttributes(ubahnToken)
  skillProviderId = await helper.getSkillProviderId(ubahnToken)
}


/**
 * Process identity create entity message
 * @param {Object} message the kafka message
 */
async function processCreate(message) {

  const location = await helper.getMemberLocation(message.payload.handle, topcoderToken)
  const topic = _.get(message, 'topic', null)
  const handle = _.get(message, 'payload.handle', null)

  let userId = null
  if ((topic === config.BACKENDJOB_USER_SYNC) || (topic === config.BACKENDJOB_USER_SKILL_SYNC)) {
    logger.debug(`fetching v5 user ${handle}`)
    userId = await helper.getUser(handle, ubahnToken)
    logger.debug(`fetched v5 user ${handle} id is ${userId}`)
  }
  if ((!userId) || (topic === config.IDENTITY_NOTIFICATION_CREATE)) {
    logger.debug(`creating user ${userId} and topic ${topic}`)
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
      logger.debug(`member skills is : ${JSON.stringify(userSkill)}`)
      const skillId = await helper.getSkillId(skillProviderId, userSkill.name, ubahnToken)
      logger.debug(`fetched v5 skill id is : ${skillId}`)
      if (skillId) {
        helper.sleep()
        try {
          logger.info(`create user skill: ${userSkill.name}: ${typeof userSkill.score} ${typeof userSkill.score.toString()}`)
          await helper.createUserSkill(userId, skillId, userSkill.score.toString(), ubahnToken)
          logger.info(`user skill: ${userSkill.name}:${userSkill.score} created`)
        } catch (error) {
          logger.error(`user skill insert error : ${error}`)
        }
      } else {
        logger.error(`Cannot find skill with name ${userSkill.name} and skill provider id ${skillProviderId} in u-bahn`)
      }
    }
  }
}

init()

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
