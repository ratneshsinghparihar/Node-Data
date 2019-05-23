import * as Enumerable from 'linq';
import { MetaUtils } from "../../core/metadata/utils";
import { MetaData } from '../../core/metadata/metadata';
import { Decorators } from '../../core/constants/decorators';
import {pathRepoMap} from '../dynamic/model-entity';
import * as Utils from "../utils";
export interface QueryOptions {
    rows?: number;
    start?: number;
    from?: Date;
    until?: Date;
    order?: "asc" | "desc";
    fields?: any;
    skip?: number;
    limit?: number;
    sort?: any;
    lt?: any;
    gt?: any;
    lt_value?: any;
    gt_value?: any;
    lte?: any;
    gte?: any;
    lte_value?: any;
    gte_value?: any;
}

export var getQueryOptionsFromQuery = (repository: any, query: { queryObj: any, options: any }) => {
    let primaryKey;
    var metaDataMap = MetaUtils.getMetaData(repository.entity.model, Decorators.COLUMN);
    let entityService = Utils.entityService(pathRepoMap[repository.path].modelType)
    for (var field in metaDataMap) {
        var fieldMetadata: MetaData = <MetaData>metaDataMap[field];
        if (fieldMetadata.params.primaryKey) {
            primaryKey = fieldMetadata.params.name;
        }
    }

    var queryObj = query;
    var options = {};
    Enumerable.from(queryObj).forEach((x: any) => {
        if (filterProps.indexOf(x.key) >= 0) {
            options[x.key] = x.value;
            if(x.key == 'sort'){
                options[x.key] = entityService.getSortCondition(x.value);
            }
            else{
                options[x.key] = x.value;
            }
            delete queryObj[x.key];
        }
        else
            if (primaryKey && x.key == primaryKey && x.key) {
                let valStr = queryObj[x.key]; //Incoming Comma Separated String Values
                let valArray;
                if (valStr == "" || valStr == null || valStr == "null" || valStr == '""' || valStr == "''" || valStr == undefined || valStr == "undefined") {
                    valArray = [];
                }
                else {
                    valArray = valStr.split(","); //Convert Comma Separated Values to Array
                }
                queryObj[x.key] = { $in: valArray };
            }
            else {
                var val = queryObj[x.key];
                var i = val.indexOf('%LIKE%');
                if (i == 0) {
                    // contains
                    val = val.replace('%LIKE%', '');
                    queryObj[x.key] = entityService.getLikeCondition(val);
                }
                else {
                    i = val.indexOf('%START%');
                    if (i == 0) {
                        // starts with
                        val = val.replace('%START%', '');
                        queryObj[x.key] = entityService.getStartsWithCondition(val);
                    }
                }
            }
    });
    return { queryObj: queryObj, options: options }
}

export var filterProps: Array<string> = ['rows', 'start', 'from', 'until', 'order', 'fields', 'skip', 'limit', 'sort', 'lt', 'gt', 'lte', 'gte', 'lt_value', 'gt_value', 'lte_value', 'gte_value'];
