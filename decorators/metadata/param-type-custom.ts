
export class ParamTypeCustom {
    rel: any;
    itemType: any;
    isArray: boolean;
    constructor(rel: string, itemType: any, isArray: boolean){
        this.rel = rel;
        this.itemType = itemType;
        this.isArray = isArray;
    }
}