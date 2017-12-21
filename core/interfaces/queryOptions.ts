import * as Enumerable from 'linq';
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

export var getQueryOptionsFromQuery = (query): { queryObj: any, options: any }=>{
    var queryObj = query;
    var options = {};
    Enumerable.from(queryObj).forEach((x: any) => {
        if (filterProps.indexOf(x.key) >= 0) {
            options[x.key] = x.value;
            delete queryObj[x.key];
        }
        else {
            var val = queryObj[x.key];
            var i = val.indexOf('%LIKE%');
            if (i == 0) {
                // contains
                val = val.replace('%LIKE%', '');
                queryObj[x.key] = {
                    $regex: '.*' + val + '.*'
                }
            }
            else {
                i = val.indexOf('%START%');
                if (i == 0) {
                    // starts with
                    val = val.replace('%START%', '');
                    queryObj[x.key] = {
                        $regex: '^' + val + '.*'
                    }
                }
            }
        }
    });
    return { queryObj: queryObj, options: options}
}

export var filterProps: Array<string> = ['rows', 'start', 'from', 'until', 'order', 'fields', 'skip', 'limit', 'sort','lt','gt','lte','gte','lt_value','gt_value','lte_value','gte_value'];
