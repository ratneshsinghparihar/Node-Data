
export class ParamTypeCustom {
    rel: any;
    itemType: any;
    isArray: boolean;
    embedded: boolean;
    level: number;
    constructor(rel: string, itemType: any, isArray: boolean, embedded: boolean, level: number) {
        this.rel = rel;
        this.itemType = itemType;
        this.isArray = isArray;
        this.embedded = embedded;
        this.level = level; // set -1 for infinite levels
    }
}