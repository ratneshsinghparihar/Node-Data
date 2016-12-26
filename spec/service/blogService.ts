import Q = require('q');


export interface BlogService {
    loadBlogByField(field: any, value: any): Q.Promise<any>;
    writeBlog(fileName: any, data: any): Q.Promise<any>;
}