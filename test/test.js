'use strict'

var InfluxDbUdp = require('..');
var assert = require('assert');

describe('InfluxDbUdp', function() {
  var client = new InfluxDbUdp();

  beforeEach(function() {
    // capture the content the Udp client sends so we can test it
    client.socket.send = function (buffer, start, end, port, host) {
      client.udpMessage = buffer.toString().substr(start, end);
    };
  });

  // tests use indexOf for comparison since each udp message includes
  // a variable timestamp at the end of the message

  describe('#send()', function () {
    it('should format a simple message properly', function () {
      client.send('foo', 1);
      assert.notEqual(client.udpMessage.indexOf('foo value=1'), -1);
    });

    it('should send "1" as a string rather than a number', function () {
      client.send('foo', '1');
      assert.notEqual(client.udpMessage.indexOf('foo value="1"'), -1);
    });

    it('should send 1.0 as a float rather than an integer', function () {
      client.send('foo', 1.2);
      assert.notEqual(client.udpMessage.indexOf('foo value=1.2'), -1);
    });

    it('should format a complex message properly', function () {
      client.send("foo", {"field1": 1, "field3": 2, "field2": 3},
                         {"tag1": "one", "tag0": "two"});
      assert.notEqual(client.udpMessage.indexOf(
          "foo,tag0=two,tag1=one field1=1,field2=3,field3=2"), -1);
    });

    it('should quote strings for field values', function () {
      client.send("foo", {"field1": "field 1"});
      assert.notEqual(client.udpMessage.indexOf("foo field1=\"field 1\""), -1);
    });

    it('should escape spaces in tag values', function () {
      client.send("foo", 1, {"tag": "test test"});
      assert.notEqual(client.udpMessage.indexOf("foo,tag=test\\ test value=1"), -1);
    });

    it('should escape commas in tag values', function () {
      client.send("foo", 1, {"tag": "test,test"});
      assert.notEqual(client.udpMessage.indexOf("foo,tag=test\\,test value=1"), -1);
    });

    it('should escape quotes in tag values', function () {
      client.send("foo", 1, {"tag": "test\"test"});
      assert.notEqual(client.udpMessage.indexOf("foo,tag=test\\\"test value=1"), -1);
    });

    it('should represent true properly for field values', function () {
      client.send("foo", true);
      assert.notEqual(client.udpMessage.indexOf("foo value=TRUE"), -1);
    });

    it('should represent false properly for field values', function () {
      client.send("foo", false);
      assert.notEqual(client.udpMessage.indexOf("foo value=FALSE"), -1);
    });

    it('should represent integers properly for field values', function () {
      client.send("foo", 12345);
      assert.notEqual(client.udpMessage.indexOf("foo value=12345"), -1);
    });
  });

  describe('#sendPoints()', function () {
    it('should format a series of messages properly', function () {
      client.sendPoints("foo", [1, 2, 3]);
      assert.notEqual(client.udpMessage.indexOf("foo value=1"), -1);
      assert.notEqual(client.udpMessage.indexOf("\nfoo value=2"), -1);
      assert.notEqual(client.udpMessage.indexOf("\nfoo value=3"), -1);
    });

    it('should apply tags to each point', function () {
      client.sendPoints("foo", [1, 2, 3], {"tag": "x"});
      assert.notEqual(client.udpMessage.indexOf("foo,tag=x value=1"), -1);
      assert.notEqual(client.udpMessage.indexOf("\nfoo,tag=x value=2"), -1);
      assert.notEqual(client.udpMessage.indexOf("\nfoo,tag=x value=3"), -1);
    });

    it('should support tag at the point and global level', function () {
      client.sendPoints("foo", [[1, {"tag1": "x"}], 2, 3], {"tag2": "x"});
      assert.notEqual(client.udpMessage.indexOf("foo,tag1=x,tag2=x value=1"), -1);
      assert.notEqual(client.udpMessage.indexOf("\nfoo,tag2=x value=2"), -1);
      assert.notEqual(client.udpMessage.indexOf("\nfoo,tag2=x value=3"), -1);
    });
  });
});
