import Q = require('q');
import {repository} from "../../core/decorators/repository";
import {inject} from "../../di/decorators/inject";
import {blog} from "../models/blog";
import {blogServiceImpl} from "../services/blogServiceImpl";

@repository({path:"blogRepo",model:blog}) 
export class BlogRepository {
    
    //    @inject(blogServiceImpl)
    //    blogServiceImpl1: blogServiceImpl;

     findByField(field: string, value: string): Q.Promise<any> {
        return Q.fcall(() => {
            var blogObject = {
                "_id": "56b07218fc2e4f4427e9ff8f",
                "name": "john",
                "post": "welcome to Node-Data"
            }
            return blogObject;
        });
    }

    //    doWorkerTask(){
    //        var filePath="/Users/asishs/Projects/Node-Data/Enhancement_On_Node_Data/Node-Data/spec/OutputFiles/file.txt";
    //        this.blogServiceImpl1.writeBlog(filePath,"Hello");
    //    }

}