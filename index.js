/**
 * influxDbUDP - InfluxDB UDP client
 * Implements the InfluxDB line protocol for sending points of
 * data to an InfluxDB server via the UDP protocol.
 */

'use strict';

var dgram = require('dgram');

var InfluxDbUdp = function influxDbUDP(opts) {
    opts = opts || {};
    this.host = opts.host || '127.0.0.1';
    this.port = opts.port || 4444;
    this.socket = dgram.createSocket('udp4');
};

function _formatFieldValue(value) {
    if (value === true) {
        value = 'TRUE';
    }
    else if (value === false) {
        value = 'FALSE';
    }
    else if (typeof value === 'string') {
        // strings must be in quotes
        value = '"' + value.replace(/"/g, '\\"') + '"';
    }

    return value.toString();
}

function _formatTagValue(value) {
    // escape spaces, commas, and quotes since those are special characters
    return value.toString().replace(/([ ,"])/g, '\\$1');
}

// Specification used for InfluxDB line protocol:
// https://docs.influxdata.com/influxdb/v0.11/write_protocols/line/
function _formatMessage(measure, values, tags) {
    var message = measure;
    if (tags) {
        var tagKeys = Object.keys(tags).sort();
        for (var tag in tagKeys) {
            tag = tagKeys[tag];
            message += ',' + tag + '=' + _formatTagValue(tags[tag]);
        }
    }
    if (values) {
        var valueArray = [];
        var valueKeys = Object.keys(values).sort();
        for (var key in valueKeys) {
            key = valueKeys[key];
            valueArray.push(key + '=' + _formatFieldValue(values[key]));
        }
        message += ' ' + valueArray.join(',');
    }
    // Send timestamp value to server as nanoseconds, the default precision
    return message + ' ' + (Date.now() * 1000000);
}

function _extend(dest, obj) {
    if (typeof obj === 'object') {
        var keys = Object.keys(obj);
        for (var key in keys) {
            dest[keys[key]] = obj[keys[key]];
        }
    }

    return dest;
}

InfluxDbUdp.prototype.send = function influxSendPoint(measure, point, tags) {
    this.sendPoints(measure, [point], tags);
};

/**
 * Accepts "measure", an array of points and a tags object. The points will be
 * sent as a single batch (be sure to configure your relay to have a buffer
 * large enough to receive your batches).
 *
 * client.sendPoints("measure", [10], {"tag": "value"})
 *    sends one point, tagged "tag"
 *
 * client.sendPoints("measure", [1, 2, 3], {"tag": "value"})
 *    sends three points, tagged "tag"
 *
 * client.sendPoints("measure", [[1, {"tag1": "value 1"}],
 *                               [2, {"tag2": "value 2"}]],
 *                              {"common-tag": "value"})
 *    sends two points tagged "tag1" and "common-tag"
 */
InfluxDbUdp.prototype.sendPoints = function influxSendPoints(measure, points, globalTags) {
    var messages = [];
    for (var i=0; i < points.length; i++) {
        var point = points[i];
        var pointTags = _extend({}, globalTags);

        // if a given point is an array, it's a tuple of [point, tags]
        if (Array.isArray(point)) {
            _extend(pointTags, point[1]);
            point = point[0];
        }

        // if invoked to send a single datapoint, assign "value" as a
        // default field name for the value.
        if (typeof point !== 'object') {
            point = {'value': point};
        }

        messages.push(_formatMessage(measure, point, pointTags));
    }

    var buffer = new Buffer(messages.join('\n'));
    this.socket.send(buffer, 0, buffer.length, this.port, this.host);
};

module.exports = InfluxDbUdp;
