'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var getMessage = require('./model');
var db:any = require('../db');
var Message;
var parentCallBack;
function Messenger(options) {
    EventEmitter.apply(this, arguments);
    var o = options || {};
    this.subscribed = {};
    this.lastMessageTimestamp = null;
    this.startingMessageTimestamp = new Date();
    this.retryInterval = o.retryInterval || 3000;
    db.addEmitter(this);
    console.log("messenger created");
}

util.inherits(Messenger, EventEmitter);

Messenger.prototype.send = function send(channel, msg, callback) {
   
    var cb = function noop() { };
    if (typeof callback === 'function') {
        cb = callback;
    }
    if (!Message) {
        Message = getMessage();
    }
    var message = new Message({
        channel: channel,
        message: msg
    });
    message.save(function (err) {
        return true;
    });
    
};


Messenger.prototype.sendPendingMessage = function sendPendingMessage(rechannel, lastemit,receiver:any) {
    var self = this;
    var query: any = { channel: rechannel, timestamp: { $gte: lastemit } };
    
    if (!Message) {
        Message = getMessage();
    }
    var stream = Message.find(query).stream();

    stream.on('data', function data(doc) {
        self.lastMessageTimestamp = doc.timestamp;
        doc.message.receiver = receiver;
        if (self.subscribed[doc.channel]) {
            self.emit(doc.channel, doc.message);
        }
    });

    // reconnect on error
    stream.on('error', function streamError() {
        stream.destroy();
        self.connect();
    });
}


Messenger.prototype.onConnect = function onConnect(callback) {
    var self = this;
    self.parentCallBack = callback;
    console.log("on connect recieved");
    self.on('databaseconnected', (conn) => {
        console.log('databaseconnected');
       self.connect(self.parentCallBack);
    });
}


Messenger.prototype.connect = function connect(callback) {
    var self = this;
    console.log("messenger started on ", new Date());
    console.log("messenger last time stamp is", self.startingMessageTimestamp);
    var query:any = { timestamp: { $gte: self.startingMessageTimestamp } };
    if (self.lastMessageTimestamp) {
        query = { timestamp: { $gt: self.lastMessageTimestamp } };
    }
    if (!Message) {
        Message = getMessage();
    }
    var stream = Message.find(query).setOptions({ tailable: true, tailableRetryInterval: self.retryInterval, numberOfRetries: Number.MAX_VALUE }).stream();
    
    stream.on('data', function data(doc) {
        self.lastMessageTimestamp = doc.timestamp;
        if (self.subscribed[doc.channel]) {
            self.emit(doc.channel, doc.message);
        }
    });
    
    // reconnect on error
    stream.on('error', function streamError(error) {
        if (error && error.message) {
            console.log(error.message);
        }
        stream.destroy();
        setTimeout(() => {
            self.connect()
        }, 2000); 
    });
    
    if (callback) callback();
};

Messenger.prototype.subscribe = function subscribe(channel, bool) {
    var self = this;
    if (channel && bool) {
        self.subscribed[channel] = bool;
        return;
    }
    if (channel && self.subscribed[channel]) {
        delete self.subscribed[channel];
    }
};

module.exports = Messenger;
