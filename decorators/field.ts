import * as Utils from "./metadata/utils";

export function field(params?: {itemType: any}) {
    return function (target: Object, propertyKey: string) {

        console.log('field - propertyKey: ', propertyKey, ', target:', target);
        var aa = params;
        Utils.addMetaData(<Utils.IMetaTarget>target, "field", Utils.DecoratorType.PROPERTY, params, propertyKey);
    }
}