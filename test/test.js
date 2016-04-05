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
      assert.equal(client.udpMessage.indexOf('foo value=1i'), 0);
    });

    it('should send "1" as a string rather than a number', function () {
      client.send('foo', '1');
      assert.equal(client.udpMessage.indexOf('foo value="1"'), 0);
    });

    it('should send 1.0 as a float rather than an integer', function () {
      client.send('foo', 1.2);
      assert.equal(client.udpMessage.indexOf('foo value=1.2'), 0);
    });

    it('should format a complex message properly', function () {
      client.send("foo", {"field1": 1, "field3": 2, "field2": 3},
                         {"tag1": "one", "tag0": "two"});
      assert.equal(client.udpMessage.indexOf(
          "foo,tag0=two,tag1=one field1=1i,field2=3i,field3=2i"), 0);
    });

    it('should quote strings for field values', function () {
      client.send("foo", {"field1": "field 1"});
      assert.equal(client.udpMessage.indexOf("foo field1=\"field 1\""), 0);
    });

    it('should escape spaces in tag values', function () {
      client.send("foo", 1, {"tag": "test test"});
      assert.equal(client.udpMessage.indexOf("foo,tag=test\\ test value=1i"), 0);
    });

    it('should escape commas in tag values', function () {
      client.send("foo", 1, {"tag": "test,test"});
      assert.equal(client.udpMessage.indexOf("foo,tag=test\\,test value=1i"), 0);
    });

    it('should escape quotes in tag values', function () {
      client.send("foo", 1, {"tag": "test\"test"});
      assert.equal(client.udpMessage.indexOf("foo,tag=test\\\"test value=1i"), 0);
    });

    it('should represent true properly for field values', function () {
      client.send("foo", true);
      assert.equal(client.udpMessage.indexOf("foo value=TRUE"), 0);
    });

    it('should represent false properly for field values', function () {
      client.send("foo", false);
      assert.equal(client.udpMessage.indexOf("foo value=FALSE"), 0);
    });

    it('should represent integers properly for field values', function () {
      client.send("foo", 12345);
      assert.equal(client.udpMessage.indexOf("foo value=12345i"), 0);
    });
  });

  describe('#sendPoints()', function () {
    it('should format a series of messages properly', function () {
      client.sendPoints("foo", [1, 2, 3]);
      assert.equal(client.udpMessage.indexOf("foo value=1i"), 0);
      assert.equal(client.udpMessage.indexOf("\nfoo value=2i"), 23);
      assert.equal(client.udpMessage.indexOf("\nfoo value=3i"), 47);
    });

    it('should apply tags to each point', function () {
      client.sendPoints("foo", [1, 2, 3], {"tag": "x"});
      assert.equal(client.udpMessage.indexOf("foo,tag=x value=1i"), 0);
      assert.equal(client.udpMessage.indexOf("\nfoo,tag=x value=2i"), 29);
      assert.equal(client.udpMessage.indexOf("\nfoo,tag=x value=3i"), 59);
    });

    it('should support tag at the point and global level', function () {
      client.sendPoints("foo", [[1, {"tag1": "x"}], 2, 3], {"tag2": "x"});
      assert.equal(client.udpMessage.indexOf("foo,tag1=x,tag2=x value=1i"), 0);
      assert.equal(client.udpMessage.indexOf("\nfoo,tag2=x value=2i"), 37);
      assert.equal(client.udpMessage.indexOf("\nfoo,tag2=x value=3i"), 68);
    });
  });
});
