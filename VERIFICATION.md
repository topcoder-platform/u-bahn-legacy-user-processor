# Verification

You will be entering the messages into only one topic:

```
docker exec -it identity-data-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic identity.notification.create
```

1. start kafka server, start processor app
2. write message:
  `{"recipients":[],"notificationType":"useractivation"}`
3. Watch the app console, It will show error message.
4. Write message: `{"topic":"identity.notification.create","originator":"identity-service","timestamp":"2019-07-08T00:00:00.000Z","mime-type":"application/json","payload":{"id":"10000001","modifiedBy":null,"modifiedAt":null,"createdBy":null,"createdAt":null,"handle":"theuserhandle","email":"theuserhandle@gmail.com","firstName":"User","lastName":"Member","credential":{"activationCode":"ABCDEFGHIJK","resetToken":null,"hasPassword":true},"profiles":null,"status":"U","country":{"code":"040","name":"Austria","isoAlpha2Code":"AT","isoAlpha3Code":"AUT"},"regSource":null,"utmSource":null,"utmMedium":null,"utmCampaign":null,"roles":null,"ssoLogin":false,"active":false,"profile":null,"emailActive":false}}`
5. Watch the app console. It will show message successfully handled. The log should look like:
  ```
  info: user: theuserhandle created
  debug: Sleeping for 1000 ms
  info: external profile: 36ed815b-3da1-49f1-a043-aaed0a4e81ad created
  debug: Sleeping for 1000 ms
  info: user attribute: isAvailable created
  debug: Sleeping for 1000 ms
  info: user attribute: company created
  debug: Sleeping for 1000 ms
  info: user attribute: title created
  debug: Sleeping for 1000 ms
  info: user attribute: location created
  debug: Sleeping for 1000 ms
  info: user attribute: email created
  debug: EXIT handle
  debug: Successfully processed message
  debug: Commiting offset after processing message
  ```
6. Now, write the following message: `{"topic":"identity.notification.create","originator":"identity-service","timestamp":"2019-07-08T00:00:00.000Z","mime-type":"application/json","payload":{"id":"10000001","modifiedBy":null,"modifiedAt":"2021-04-07T15:02:18.72Z","createdBy":null,"createdAt":"2021-04-07T15:02:18.72Z","handle":"theuserhandle","email":"theuserhandle@gmail.com","firstName":"User","lastName":"Member","credential":{"activationCode":"ABCDEFGHIJK","resetToken":null,"hasPassword":true},"profiles":null,"status":"A","country":null,"regSource":null,"utmSource":null,"utmMedium":null,"utmCampaign":null,"roles":null,"ssoLogin":false,"active":true,"profile":null,"emailActive":true}}`
7. Watch the app console.  It will show message successfully handled. The log should look like:
  ```
  info: user attribute: isAvailable updated
  debug: EXIT handle
  debug: Successfully processed message
  debug: Commiting offset after processing message
  ```
