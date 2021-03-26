/**
 * Contains generic helper methods
 */

const config = require('config')
const _ = require('lodash')
const axios = require('axios')
const qs = require('querystring')
const m2mAuth = require('tc-core-library-js').auth.m2m
const logger = require('./logger')

const ubahnM2MConfig = _.pick(config, ['AUTH0_URL', 'AUTH0_UBAHN_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL'])
const topcoderM2MConfig = _.pick(config, ['AUTH0_URL', 'AUTH0_TOPCODER_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL'])

const ubahnM2M = m2mAuth({ ...ubahnM2MConfig, AUTH0_AUDIENCE: ubahnM2MConfig.AUTH0_UBAHN_AUDIENCE })
const topcoderM2M = m2mAuth({ ...topcoderM2MConfig, AUTH0_AUDIENCE: topcoderM2MConfig.AUTH0_TOPCODER_AUDIENCE })
/**
 * Use this function to halt execution
 * js version of sleep()
 * @param {Number} ms Timeout in ms
 */
async function sleep (ms) {
  if (!ms) {
    ms = config.SLEEP_TIME
  }

  logger.debug(`Sleeping for ${ms} ms`)

  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get Kafka options
 * @return {Object} the Kafka options
 */
function getKafkaOptions () {
  const options = { connectionString: config.KAFKA_URL, groupId: config.KAFKA_GROUP_ID }
  if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
    options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
  }
  return options
}

/**
 * Function to get M2M token
 * (U-Bahn APIs only)
 * @returns {Promise}
 */
async function getUbahnToken () {
  return ubahnM2M.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Function to get M2M token
 * (U-Bahn APIs only)
 * @returns {Promise}
 */
async function getTopcoderToken () {
  return topcoderM2M.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Create a new User
 * @param {Object} body
 * @param {String} token
 * @returns {Number} userId
 */
async function createUser(body, token) {
  try {
    const res = await axios.post(`${config.UBAHN_API_URL}/users`, body, { headers: { Authorization: `Bearer ${token}` } })
    return res.data.id
  } catch (error) {
    logger.error(`creating v5 user error: ${error}`)
    return null
  }
}

/**
 * Get organization id
 * @param {String} token
 */
async function getOrganizationId (token) {
  const res = await axios.get(`${config.UBAHN_API_URL}/organizations`, { headers: { Authorization: `Bearer ${token}` }, params: { name: config.ORGANIZATION_NAME } })
  if (res.data && res.data.length > 0) {
    return res.data[0].id
  }
}

/**
 * Get all attributes
 * @param {String} token
 * @returns a map (name -> id)
 */
async function getAttributes (token) {
  const res = await axios.get(`${config.UBAHN_API_URL}/attributeGroups`, { headers: { Authorization: `Bearer ${token}` }, params: { name: config.ATTRIBUTE_GROUP_NAME } })
  if (res.data && res.data.length > 0) {
    const attributes = await axios.get(`${config.UBAHN_API_URL}/attributes`, { headers: { Authorization: `Bearer ${token}` }, params: { attributeGroupId: res.data[0].id } })
    return _.fromPairs(_.map(attributes.data, a => [a.name, a.id]))
  }
}

/**
 * Get all skills
 * @param {String} token
 * @returns a map (name -> id)
 */
async function getSkillProviderId (token) {
  const res = await axios.get(`${config.UBAHN_API_URL}/skillsProviders`, { headers: { Authorization: `Bearer ${token}` }, params: { name: config.SKILL_PROVIDER_NAME } })
  if (res.data && res.data.length > 0) {
    return res.data[0].id
  }
}

/**
 * Get the skillId
 * @param {String} skillProviderId
 * @param {String} name
 * @param {String} token
 */
async function getSkillId (skillProviderId, name, token) {
  const res = await axios.get(`${config.UBAHN_API_URL}/skills`, { headers: { Authorization: `Bearer ${token}` }, params: { skillProviderId, name } })
  if (res.data && res.data.length > 0) {
    return res.data[0].id
  }
}

/**
 * Returns the member location for the member handle
 * @param {String} handle The member handle
 */
async function getMemberLocation (handle, token) {
  try {
  const res = await axios.get(`${config.MEMBERS_API_URL}/${qs.escape(handle)}`, { headers: { Authorization: `Bearer ${token}` } })
  const location = _.pick(_.get(res, 'data', {}), ['homeCountryCode', 'competitionCountryCode'])
  return location.homeCountryCode || location.competitionCountryCode || 'n/a'
  } catch(error) {
    logger.error(`unable to get member ${handle}: ${error}`)
  }
}

/**
 * Returns the member's skills
 * @param {String} handle The member's handle
 */
async function getMemberSkills (handle, token) {
  const url = `${config.MEMBERS_API_URL}/${qs.escape(handle)}/skills`
  try {
    const res = await axios.get(url, {
      params: {
        fields: 'skills'
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    const { skills } = res.data

    const skillDetails = Object.keys(skills).map(key => ({
      name: skills[key].tagName,
      score: skills[key].score
    }))

    return skillDetails
  } catch (error) {
    logger.error(`unable to get member ${handle} skill: ${error}`)
    if (error.response.status === 404) {
      // No skills exist for the user
      return []
    }
    //throw error
  }
}

/**
 * Create user attribute
 * @param {String} userId
 * @param {String} attributeId
 * @param {String} value
 * @param {String} token
 */
async function createUserAttribute(userId, attributeId, value, token) {
  try {
    await axios.post(`${config.UBAHN_API_URL}/users/${userId}/attributes`, { attributeId, value }, { headers: { Authorization: `Bearer ${token}` } })
  } catch (error) {
    logger.error(` create user ${userId} attribute ${attributeId} ${value}, error: ${error}`)
  }
}

/**
 * Create external profile
 * @param {String} userId
 * @param {Object} body
 * @param {String} token
 */
async function createExternalProfile (userId, body, token) {
  await axios.post(`${config.UBAHN_API_URL}/users/${userId}/externalProfiles`, body, { headers: { Authorization: `Bearer ${token}` } })
}

/**
 * Create user skill
 * @param {String} userId
 * @param {String} skillId
 * @param {String} metricValue
 * @param {String} token
 */
async function createUserSkill (userId, skillId, metricValue, token) {
  await axios.post(`${config.UBAHN_API_URL}/users/${userId}/skills`, { skillId, metricValue }, { headers: { Authorization: `Bearer ${token}` } })
}

/**
 * Get User
 * @param {String} handle
 * @param {String} token
 * @returns {Number} userId
 */
async function getUser(handle, token) {
  try {
    const res = await axios.get(`${config.UBAHN_API_URL}/users?handle=${handle}`, { headers: { Authorization: `Bearer ${token}` } })
    return _.get(res, 'data[0].id', null)
  } catch (error) {
    logger.error(`get v5 user ${handle} error ${error}`)
    return null
  }
}

module.exports = {
  getKafkaOptions,
  sleep,
  getUbahnToken,
  getTopcoderToken,
  getOrganizationId,
  getAttributes,
  getSkillProviderId,
  getSkillId,
  getMemberLocation,
  getMemberSkills,
  createUser,
  createUserAttribute,
  createExternalProfile,
  createUserSkill,
  getUser
}
