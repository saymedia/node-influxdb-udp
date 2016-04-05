# InfluxDbUdp

This is a library for sending InfluxDB point data via the UDP protocol.
It uses the InfluxDB line protocol for formatting messages it sends.

## Client Creation

The constructor method accepts a `host` and `port` to identify the InfluxDB
instance to use. Note that the InfluxDB listening UDP port is pre-configured
for a specific database.

```js
const InfluxDbUdp = require('influx-db-udp');

var client = new InfluxDbUdp({
  'host': 'influxdb-server',
  'port': 1234
});
```

## Sending Point Data

Note that the library will escape field and tag value data when
necessary, but does not process field and tag names. Make sure
you are sending valid field and tag names since the client does
not validate these.

### InfluxDbUdp.send(_measurement_, _fields_, _tags_)

`fields` can either be a simple value, or can be an object whose
keys are field names and values are the values for them.

`tags` is optional but can be an object of key/value pairs for
tagging the point.

Some examples:

```js
// send a single point (this style will write using "value" as the
// field name by default)
client.send('measure_name', 10);

// send multiple field values
client.send('measure_name', {'value_1': 10, 'value_2': 20});

// send a value with tags
client.send('measure_name', 10, {'tag_name': 'tag_value'});
```

### InfluxDbUdp.sendPoints(_measurement_, _points_, _tags_)

This method will send a series of points in a single UDP message.
_The UDP listener should be configured with a buffer of sufficient size
to accept the messages you're sending. This client does no checking
or splitting of point data into multiple batches if it exceeds the
buffer you've configured for the server._

`points` is an array of point data. Each element of the array can
be a simple value, or can be an object whose keys are field names
and values are the values for them. An individual point can also
provide tag data (in which case, the point value is specified as
an array tuple; the first element is the value and the second is
the tag object).

`tags` is optional but can be an object of key/value pairs for
tagging all points provided.

Some examples:

```js
// send multiple points in a batch
client.sendPoints('measure_name', [1,2,3]);

// send multiple points with multiple fields
client.sendPoints('measure_name', [
  {'field1': 'one',
   'field2': 'two'},
  {'field1': 'three',
   'field2': 'four'}]);

// send multiple points with varying tag values
client.sendPoints('measure_name', [
  [1, {'tag': 'red'}],
  [2, {'tag': 'blue'}],
  [3, {'tag': 'orange'}]
]);

// send multiple points, all tagged with the same tag
client.sendPoints('measure_name', [1, 2, 3], {'tag': 'red'});
```
