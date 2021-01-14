/**
 * The application entry point
 */
global.Promise = require('bluebird')
const config = require('config')
const _ = require('lodash')
const Kafka = require('no-kafka')
const healthcheck = require('topcoder-healthcheck-dropin')
const logger = require('./common/logger')
const helper = require('./common/helper')
const ProcessorService = require('./services/ProcessorService')

// Start kafka consumer
logger.info('Starting kafka consumer')
// create consumer
const consumer = new Kafka.GroupConsumer(helper.getKafkaOptions())

/*
 * Data handler linked with Kafka consumer
 * Whenever a new message is received by Kafka consumer,
 * this function will be invoked
 */
const dataHandler = (messageSet, topic, partition) => Promise.each(messageSet, async (m) => {
  const message = m.message.value.toString('utf8')
  logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${
    m.offset}; Message: ${message}.`)

  let messageJSON
  try {
    messageJSON = JSON.parse(message)
  } catch (e) {
    logger.error('Invalid message JSON.')
    logger.logFullError(e)
    logger.debug('Commiting offset after processing message')
    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }

  if (!_.has(messageJSON, 'payload.handle')) {
    logger.error(`The message ${JSON.stringify(messageJSON)} doesn't match message format.`)

    logger.debug('Commiting offset after processing message')

    // commit the message and ignore it
    await consumer.commitOffset({ topic, partition, offset: m.offset })
    return
  }
  try {
    await ProcessorService.processCreate(messageJSON)
    logger.debug('Successfully processed message')
  } catch (err) {
    logger.logFullError(err)
  } finally {
    logger.debug('Commiting offset after processing message')
    // Commit offset regardless of error
    await consumer.commitOffset({ topic, partition, offset: m.offset })
  }
})

// check if there is kafka connection alive
const check = () => {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach(conn => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

const topics = [config.IDENTITY_NOTIFICATION_CREATE]

consumer
  .init([{
    subscriptions: topics,
    handler: dataHandler
  }])
  .then(() => {
    logger.info('Initialized.......')
    healthcheck.init([check])
    logger.info(topics)
    logger.info('Kick Start.......')
  })
