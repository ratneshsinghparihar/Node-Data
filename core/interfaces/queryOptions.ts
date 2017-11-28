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

export var filterProps: Array<string> = ['rows', 'start', 'from', 'until', 'order', 'fields', 'skip', 'limit', 'sort'];
