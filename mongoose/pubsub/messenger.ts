'use strict';

var util = require('util');
import events = require('events');
var EventEmitter: any = require('events').EventEmitter;
var getMessage = require('./model');
var db: any = require('../db');

var parentCallBack;
export class Messenger extends events.EventEmitter {

    subscribed = {};
    lastMessageTimestamp = null;
    startingMessageTimestamp = new Date();
    retryInterval;
    parentCallBack;
    collectionName;
    Message;
    constructor(options) {
        super();
        //this.apply(this, arguments);
        var o = options || {};
        this.collectionName = options && options.collectionName;
        this.subscribed = {};
        this.lastMessageTimestamp = null;
        this.startingMessageTimestamp = new Date();
        this.retryInterval = o.retryInterval || 3000;
        db.addEmitter(this);
        console.log("messenger created");
    }

    //util.inherits(Messenger, EventEmitter);

    public chekAndSend(path: string, message: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.send(path, message, function (err, data) {
                resolve(true);
                console.log('Sent message');
            });
        })
    }
    
    send(channel, msg, callback) {

        var cb = function noop() { };
        if (typeof callback === 'function') {
            cb = callback;
        }
        if (!this.Message) {
            this.Message = getMessage(this.collectionName );
        }
        var message = new this.Message({
            channel: channel,
            message: msg
        });
        message.save(function (err) {
            return true;
        });

    };

    sendPendingMessage(rechannel, lastemit, receiver: any) {
        var self = this;
        var query: any = { channel: rechannel, timestamp: { $gt: lastemit } };

        if (!this.Message) {
            this.Message = getMessage(this.collectionName);
        }
        var stream = this.Message.find(query).stream();

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


    onConnect(callback) {
        var self = this;
        self.parentCallBack = callback;
        console.log("on connect recieved");
        self.on('databaseconnected', (conn) => {
            console.log('databaseconnected');
            self.connect(self.parentCallBack);
        });
    }


    connect(callback?:any) {
        var self = this;
        console.log("messenger started on ", new Date());
        console.log("messenger last time stamp is", self.startingMessageTimestamp);
        var query: any = { timestamp: { $gte: self.startingMessageTimestamp } };
        if (self.lastMessageTimestamp) {
            query = { timestamp: { $gt: self.lastMessageTimestamp } };
        }
        if (!this.Message) {
            this.Message = getMessage(this.collectionName);
        }
       // var stream = Message.find(query).setOptions({ tailable: true, tailableRetryInterval: self.retryInterval, numberOfRetries: Number.MAX_VALUE }).stream();
        //var stream = Message.find(query).setOptions({
        //    tailable: true, tailableRetryInterval: 200,
        //    awaitdata: false,
        //    numberOfRetries: -1
        //}).stream();

        // major performance improvement
        let stream = this.Message.find(query)
            .cursor()
            .addCursorFlag('tailable', true)
            .addCursorFlag('awaitData', true)
            //.addCursorFlag('tailableRetryInterval', self.retryInterval)
            //.addCursorFlag('numberOfRetries', Number.MAX_VALUE);

        stream.on('data', function data(doc) {
            self.lastMessageTimestamp = doc.timestamp;
            if (self.subscribed[doc.channel]) {
                self.emit(doc.channel, doc.message);
            }
        });

        //// reconnect on error
        stream.on('error', function streamError(error) {
            if (error && error.message) {
                console.log(error.message);
            }
            //stream.destroy();
            setTimeout(() => {
                self.connect()
            }, 2000);
        });

        if (callback) callback();
    };

    subscribe(channel, bool) {
        var self = this;
        if (channel && bool) {
            self.subscribed[channel] = bool;
            return;
        }
        if (channel && self.subscribed[channel]) {
            delete self.subscribed[channel];
        }
    };

}