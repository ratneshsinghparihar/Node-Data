export interface ShardInfo {
    getShardKey();
    getUniqueId();
    getCollectionNameFromSelf();
    getCollectionNameFromShardKey(id: string);
    getAllShardCollectionNames(): Array<string>; // This will be used for broadcasting queries in all the shards
}