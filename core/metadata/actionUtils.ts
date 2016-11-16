import * as Enumerable from 'linq';

export interface IActionPropertyMap {
    key: string;
    args: Array<string>
}

export function GetAllActionFromPrototype(targetProtoType: any): Array<IActionPropertyMap> {
    var properties: string[] = Object.getOwnPropertyNames(targetProtoType);
    var action = "do";
    var queryRegEx = new RegExp("^" + action, "i");

    var searchProperties: Array<string> = Enumerable.from(properties).where(p => {
        return queryRegEx.test(p);
    }).toArray();

    var namePropMap: Array<IActionPropertyMap> = [];
    var descs = [];
    Enumerable.from(searchProperties).forEach(x => {
        var desc = Object.getOwnPropertyDescriptor(targetProtoType, x);
        var arg = argumentNames(desc.value);
        namePropMap.push({ key: x, args: arg });
    });
    return namePropMap;
}

function argumentNames(fun) {
    var names = fun.toString().match(/^[\s\(]*[^(]*\(([^)]*)\)/)[1]
        .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
        .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
}
