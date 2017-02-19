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
}

export var filterProps: Array<string> = ['rows', 'start', 'from', 'until', 'order', 'fields', 'skip', 'limit', 'sort'];
