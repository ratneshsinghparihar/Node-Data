'use strict';

var mongoose = require('mongoose');
var db = require("../db");;
var Message = new mongoose.Schema({
  channel: String,
  timestamp: {type: Date, default: Date.now},
  message: {}
}, {
  capped: {
    size: 1024 * 1024 * 10, // in bytes
        autoIndexId: true

    },
    validateBeforeSave: false
});

export function getMessage(collectionName?:string)
{
    return db.getDbSpecifcModel(collectionName ? collectionName :'Message1', Message);
}

module.exports = getMessage 
