var Enumerable: linqjs.EnumerableStatic = require('linq');

export function AddSearchPathsFromPrototype(targetProtoType: Object){
  var properties : string[]= Object.getOwnPropertyNames(targetProtoType);
  // Get all the properties starting with findBy
  var findBy = "findBy";
  var queryRegEx = new RegExp("^"+findBy,"i");
  var searchProperties : Array<string> = Enumerable.from(properties).where(p=>{
    return queryRegEx.test(p);
  }).toArray();
  console.log(searchProperties);
  var s = "";

  Enumerable.from(searchProperties).forEach(p=>{
      var trimmed = p.substr(findBy.length, p.length);
      var splits = trimmed.split("And");
      console.log(splits);
  });
}
