import Mongoose = require("mongoose");
import {Types} from 'mongoose';
import {field, document} from '../../mongoose/decorators';
import {Strict} from '../../mongoose/enums/';
import {baseModel} from './baseModel';
import {ShardInfo} from '../../core/interfaces/shard-Info';

@document({ name: 'topic', strict: Strict.false })
export class topic extends baseModel implements ShardInfo {
    static count: number = 0;
    static enableSharding: boolean = false;
    static collectionName: string = 'topic';

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
        if (topic.enableSharding && this._id) {
            let newId = this.shardKey + this._id.toString().substr(1, 23);
            return Mongoose.Types.ObjectId(newId);
        }
        return (new Mongoose.Types.ObjectId());
    }

    getCollectionNameFromSelf() {
        let id = this._id.toString();
        if (topic.enableSharding && id) {
            return topic.collectionName + id.substr(0, 1);
        }
        return id;
    }

    getCollectionNameFromShardKey(id: string) {
        return topic.collectionName;
    }

    getAllShardCollectionNames(): Array<string> {
        let allColection = [topic.collectionName];
        if (topic.enableSharding) {
            for (var i = 0; i < 5; i++) {
                allColection.push(topic.collectionName + i);
            }
        }
        return allColection;
    }
}

export default topic;