'use strict';
import * as CoreUtils from '../../core/utils';
var mongoose = require('mongoose');
var db = require("../db");

var defaultMessengerSize = 1024 * 16 * 25;
var mainMessagerName = 'Message1';
var mainMessengerSize = 1024 * 16 * 25;

if (CoreUtils.config().mainMessagerName) {
    mainMessagerName = CoreUtils.config().mainMessagerName;
}

if (CoreUtils.config().mainMessengerSize) {
    mainMessengerSize = CoreUtils.config().mainMessengerSize;
}

if (CoreUtils.config().defaultMessengerSize) {
    defaultMessengerSize = CoreUtils.config().defaultMessengerSize;
}

var MessageFordefaultMessengerSize = new mongoose.Schema({
    channel: String,
    timestamp: { type: Date, default: Date.now },
    message: {}
}, {
        capped: {
            size: defaultMessengerSize, // in bytes
            autoIndexId: true

        },
        validateBeforeSave: false
    });

var MessageForMainMessengerSize = new mongoose.Schema({
    channel: String,
    timestamp: { type: Date, default: Date.now },
    message: {}
}, {
        capped: {
            size: mainMessengerSize, // in bytes
            autoIndexId: true

        },
        validateBeforeSave: false
    });

var getMessengerOfSize = (size) => new mongoose.Schema({
    channel: String,
    timestamp: { type: Date, default: Date.now },
    message: {}
}, {
        capped: {
            size: size, // in bytes
            autoIndexId: true

        },
        validateBeforeSave: false
    });


export function getMessage(collectionName?: string, size?: number) {
	
    if (CoreUtils.config().mainMessagerName) {
        mainMessagerName = CoreUtils.config().mainMessagerName;
    }

    if (CoreUtils.config().mainMessengerSize) {
        mainMessengerSize = CoreUtils.config().mainMessengerSize;
    }

    if (CoreUtils.config().defaultMessengerSize) {
        defaultMessengerSize = CoreUtils.config().defaultMessengerSize;
    }

    let schemaName = mainMessagerName;
    let schema = MessageForMainMessengerSize;
    if (collectionName) {
        schemaName = collectionName;
        schema = MessageFordefaultMessengerSize;
    }
    if (size) {
        schema = getMessengerOfSize(size);
    }

    return db.getDbSpecifcModel(schemaName, schema);
}

module.exports = getMessage 
