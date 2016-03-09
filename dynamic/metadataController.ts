import * as dc from './dynamic-controller';
var router = dc.router;
import * as Utils from "../decorators/metadata/utils";
import {GetRepositoryForName} from './dynamic-repository';
import {MetaData} from '../decorators/metadata/metadata';
var Enumerable: linqjs.EnumerableStatic = require('linq');

var ensureLoggedIn = () => {
    // Ask ritesh to call appropriate function

    //by token
    //if (Config.Security.isAutheticationByToken) {
    //    return authenticateByToken;
    //}

    ////by password
    //if (Config.Security.isAutheticationByUserPasswd) {
    //    return loggedIn();
    //}
    return function (req, res, next) {
        next();
    }
}

export class MetadataController {
    private path: string;
    private metaData: { [key: string]: any } = <any>{};
    constructor() {
        this.path = "/Metadata";
        this.AddRoutes();
    }

    private AddRoutes() {
        router.get(this.path, ensureLoggedIn(), (req, res) => {
            this.metaData['All'] = this.metaData['All'] ? this.metaData['All'] : this.getAllMetadata(req);
            this.sendresult(req, res, this.metaData['All']);
        });

        router.get(this.path + '/:type', ensureLoggedIn(), (req, res) => {
            this.sendresult(req, res, this.getMetadata(req, req.params.type));
        });
    }

    private sendresult(req, res, result) {
        res.set("Content-Type", "application/json");

        res.send(JSON.stringify(result, null, 4));
    }

    private getAllMetadata(req): any {
        var metaData = {};
        metaData['_links'] = [];

        var names = Utils.getAllResourceNames();
        Enumerable.from(names).forEach(x=> {
            var object = {};
            object['name'] = x;
            object['metadata'] = req.protocol + '://' + req.get('host') + this.path + '/' + x;
            metaData['_links'].push(object);
        });

        return metaData;
    }

    private getMetadata(req, type): any {
        
        if (this.metaData[req.params.type])
            return this.metaData[req.params.type];

        var repo = GetRepositoryForName(type);
        if (!repo)
            return null;

        var metas = Utils.getAllMetaDataForAllDecorator(repo.getEntityType());
        //var props: { [key: string]: MetaData } = <any>{};
        var props = [];
        var metaData = {};
        var properties = [];
        Enumerable.from(metas).selectMany(x=> x.value).forEach(x=> {
            var m = x as MetaData;
            if ((!props[m.propertyKey] || !m.propertyType.rel) && m.propertyType.itemType) {
                var info = {};
                info['name'] = m.propertyKey;
                if (m.propertyType.rel) {
                    var relMeta = req.protocol + '://' + req.get('host') + this.path + '/' + m.propertyType.rel;
                    info['type'] = m.propertyType.isArray ? [relMeta] : relMeta;
                }
                else {
                    info['type'] = m.propertyType.isArray ? [m.propertyType.itemType.name] : m.propertyType.itemType.name;
                }
                properties.push(info);
                props.push(m.propertyKey);
            }
        });
        metaData['id'] = type;
        metaData['properties'] = properties;
        this.metaData[req.params.type] = metaData;
        return this.metaData[req.params.type];
    }
}