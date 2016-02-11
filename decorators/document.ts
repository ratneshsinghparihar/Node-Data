import * as Utils from "./metadata/utils";

export function document(params: { name: string, isStrict?: boolean} = <any>{}) {
    return function(target: Object){
        console.log('document - target: ', target);

        for (var field in (<any>target).fields){
            console.log(field);
        }
        
        // add metadata to prototype
        Utils.addMetaData(((<any>target).prototype || target), "document", Utils.DecoratorType.CLASS, params);
        
    }
}