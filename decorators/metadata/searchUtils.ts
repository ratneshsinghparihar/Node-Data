var Enumerable: linqjs.EnumerableStatic = require('linq');

export interface ISearchPropertyMap{
    key : string;
    args : Array<string>
}

export function GetAllFindBySearchFromPrototype(targetProtoType: any) : Array<ISearchPropertyMap>{
  // get all model fields
  var properties : string[]= Object.getOwnPropertyNames(targetProtoType);
  // Get all the properties starting with findBy
  var findBy = "findBy";
  var queryRegEx = new RegExp("^"+findBy,"i");
  var searchProperties : Array<string> = Enumerable.from(properties).where(p=>{
    return queryRegEx.test(p);
  }).toArray();
  
  var namePropMap : Array<ISearchPropertyMap> = [];
  
  //Do all this exercise only if there is anything to search over.
  if(searchProperties.length === 0 ){
      return namePropMap;
  }

//   var fieldProperties = Object.getOwnPropertyNames(targetProtoType.model.prototype.decorators.field);
//   var fieldPropIter = Enumerable.from(fieldProperties);
//   searchProperties.every(p=>{
//       return fieldPropIter.contains(p);
//   });

    

    Enumerable.from(searchProperties).forEach(p=>{
      var trimmed :string = p.substr(findBy.length, p.length);
      var splits = Enumerable.from(trimmed.split("And")).select( s => {
          return s.toLowerCase(); 
        }).toArray();
    namePropMap.push( {key: p, args : splits} );
  });
  return namePropMap;
}
