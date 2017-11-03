export interface ShardInfo {
    getUniqueId();
    getCollectionNameFromSelf();
    getCollectionNameFromShardKey(id: string);
}