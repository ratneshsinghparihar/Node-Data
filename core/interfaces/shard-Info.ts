export interface ShardInfo {
    getUniqueId();
    getCollectionNameFromSelf(id?: string);
    getCollectionNameFromShardKey(id: string);
}