# Identity - Data Processor

Creates user in u-bahn when they sign up on Topcoder. Also updates their availability status in u-bahn based on their account activation status in Topcoder

## Dependencies 

- Nodejs(v12+)
- Kafka

## Configuration

Configuration for the identity processor is at `config/default.js`.
The following parameters can be set in config files or in env variables:

- LOG_LEVEL: the log level; default value: 'debug'
- KAFKA_URL: comma separated Kafka hosts; default value: 'localhost:9092'
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional; default value is undefined;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- KAFKA_GROUP_ID: the Kafka group id, default value is 'identity-processor'
- IDENTITY_NOTIFICATION_CREATE: the identity create entity Kafka message topic, default value is 'identity.notification.create'
- AUTH0_URL: The auth0 url
- AUTH0_UBAHN_AUDIENCE: The auth0 audience for accessing ubahn api(s)
- AUTH0_TOPCODER_AUDIENCE: The auth0 audience for accessing topcoder api(s)
- AUTH0_CLIENT_ID: The auth0 client id
- AUTH0_CLIENT_SECRET: The auth0 client secret
- AUTH0_PROXY_SERVER_URL: The auth0 proxy server url
- TOKEN_CACHE_TIME: The token cache time
- SLEEP_TIME: The pause time between two create operations, default value: 1000 ms
- UBAHN_API_URL: The ubahn api url, default value: 'https://api.topcoder-dev.com/v5'
- MEMBERS_API_URL: The topcoder member api url, default value: 'https://api.topcoder-dev.com/v5/members'. Not in use anymore. Retained for any future use
- ATTRIBUTE_GROUP_NAME: The attribute group name
- SKILL_PROVIDER_NAME: The skill provider name. Not in use anymore. Retained for any future use
- ORGANIZATION_NAME: The organization name
- MEMBER_PROFILE_URL_PREFIX: The member's profile url prefix. Defaults to `'https://www.topcoder.com/members/'` - don't forget the `/` at the end

There is a `/health` endpoint that checks for the health of the app. This sets up an expressjs server and listens on the environment variable `PORT`. It's not part of the configuration file and needs to be passed as an environment variable

## Local Kafka setup

1. Navigate to the directory `docker-kafka`

2. Run the following command

    ```bash
    docker-compose up -d
    ```

## Local deployment

1. Make sure that Kafka is running as per instructions above.

2. From the project root directory, run the following command to install the dependencies

    ```bash
    npm install
    ```

3. To run linters if required

    ```bash
    npm run lint
    ```

    To fix possible lint errors:

    ```bash
    npm run lint:fix
    ```

5. Start the processor and health check dropin

    ```bash
    npm start
    ```

## Local Deployment with Docker

To run the Processor using docker, follow the below steps

1. Navigate to the directory `docker`

2. Rename the file `sample.api.env` to `api.env`

3. Once that is done, run the following command

    ```bash
    docker-compose up
    ```

4. When you are running the application for the first time, It will take some time initially to download the image and install the dependencies


## Verification

see [VERIFICATION.md](VERIFICATION.md)
