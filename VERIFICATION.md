# Verification

```
{
  "topic":"identity.notification.create",
  "originator":"u-bahn-api",
  "timestamp":"2019-07-08T00:00:00.000Z",
  "mime-type":"application/json",
  "payload":{
    "id":"90064000",
    "modifiedBy":null,
    "modifiedAt":"2021-01-05T14:01:40.336Z",
    "createdBy":null,
    "createdAt":"2021-01-05T14:01:40.336Z",
    "handle":"theuserhandle",
    "email":"foo@bar.com",
    "firstName":"theuserfirstname",
    "lastName":"theuserlastname",
    "credential":{"activationCode":"FOOBAR2","resetToken":null,"hasPassword":false},
    "profiles":null,
    "status":"A",
    "country":null,
    "regSource":"null",
    "utmSource":"null",
    "utmMedium":"null",
    "utmCampaign":"null",
    "roles":null,
    "ssoLogin":false,
    "active":true,
    "profile":null,
    "emailActive":true
  }
}
```

Additionally, you will be entering the messages into only one topic:

```
docker exec -it identity-data-processor_kafka /opt/kafka/bin/kafka-console-producer.sh --broker-list localhost:9092 --topic identity.notification.create
```

1. start kafka server, start processor app
2. write message:
  `{"recipients":[],"notificationType":"useractivation"}`
3. Watch the app console, It will show error message.
4. write message:
  `{"topic":"identity.notification.create","originator":"u-bahn-api","timestamp":"2019-07-08T00:00:00.000Z","mime-type":"application/json","payload":{"id":"90064000","modifiedBy":null,"modifiedAt":"2021-01-05T14:01:40.336Z","createdBy":null,"createdAt":"2021-01-05T14:01:40.336Z","handle":"theuserhandle","email":"foo@bar.com","firstName":"theuserfirstname","lastName":"theuserlastname","credential":{"activationCode":"FOOBAR2","resetToken":null,"hasPassword":false},"profiles":null,"status":"A","country":null,"regSource":"null","utmSource":"null","utmMedium":"null","utmCampaign":"null","roles":null,"ssoLogin":false,"active":true,"profile":null,"emailActive":true}}`
5. Watch the app console, It will show message successfully handled.
