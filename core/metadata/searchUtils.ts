import * as Enumerable from 'linq';

export interface ISearchPropertyMap {
    key: string;
    args: Array<string>
}

export function GetAllFindBySearchFromPrototype(targetProtoType: any): Array<ISearchPropertyMap> {
    // Check if the model has any fields
    //   if( 
    //         targetProtoType.model 
    //   &&    targetProtoType.model.prototype 
    //   &&    targetProtoType.model.prototype.decorators 
    //   &&    targetProtoType.model.prototype.decorators.field ){
    //       console.log("There are fields");
    //   }
    //   else{
    //       return;
    //   }
    // get all model fields
    var properties: string[] = Object.getOwnPropertyNames(targetProtoType);
    // Get all the properties starting with findBy
    var findBy = "findBy";
    var queryRegEx = new RegExp("^" + findBy, "i");
    var searchProperties: Array<string> = Enumerable.from(properties).where(p=> {
        return queryRegEx.test(p);
    }).toArray();
  
    // Do all this exercise only if there is anything to search over.
    //   if(searchProperties.length === 0 ){
    //       return;
    //   }

    //   var fieldProperties = Object.getOwnPropertyNames(targetProtoType.model.prototype.decorators.field);
    //   var fieldPropIter = Enumerable.from(fieldProperties);
    //   searchProperties.every(p=>{
    //       return fieldPropIter.contains(p);
    //   });

    var namePropMap: Array<ISearchPropertyMap> = [];

    Enumerable.from(searchProperties).forEach(p=> {
        var trimmed: string = p.substr(findBy.length, p.length);
        var splits = Enumerable.from(trimmed.split("And")).select(s => {
            return s.toLowerCase();
        }).toArray();
        namePropMap.push({ key: p, args: splits });
    });
    return namePropMap;
}
