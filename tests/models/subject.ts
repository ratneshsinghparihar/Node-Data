import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {field, document} from '../../mongoose/decorators'; 
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';
import {ShardInfo} from '../../core/interfaces/shard-Info';

@document({ name: 'subject', strict: Strict.false })
export class subject extends baseModel implements ShardInfo {
    static count: number = 0;
    collectionName: string = 'subject';

    constructor(object?: any) {
        super(object);
        if (!object || !object._id) {
            this.createdDate = Date.now().toString();
        }
        // set default properties
        this.updatedDate = Date.now().toString();
    }

    @field()
    createdDate: string;

    @field()
    updatedDate: string;

    @field()
    shardKey: string;

    getShardKey() {
        return "shardKey";
    }

    getUniqueId() {
        if (this._id) {
            let newId = this.shardKey + this._id.toString().substr(1, 23);
            return Mongoose.Types.ObjectId(newId);
        }
        return (new Mongoose.Types.ObjectId());
    }

    getCollectionNameFromSelf() {
        let id = this._id.toString();
        if (id) {
            return this.collectionName + id.substr(0, 1);
        }
        return ''
    }

    getCollectionNameFromShardKey(id: string) {
        return this.collectionName;
    }

    getAllShardCollectionNames(): Array<string> {
        let allColection = [];
        for (var i = 0; i < 5; i++) {
            allColection.push(this.collectionName + i);
        }
        return allColection;
    }
}

export default subject;