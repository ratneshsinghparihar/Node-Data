import {BlogRepository} from '../repository/blogRepository';
import {blog} from '../models/blog';
import Q = require('q');
import {Worker} from '../../core/decorators/workerAssociation';
import {BlogService} from './blogService'
import {service} from '../../di/decorators/service';
import fs = require('fs');

@service({ 'singleton': true, 'serviceName': 'blogService' })
export class blogServiceImpl implements BlogService{
        ///blogRepo= new BlogRepository();


    //@Worker({name: 'workerThread', workerParams:{workerName:'', serviceName:'' ,servicemethodName:'', arguments:["john"]}})
    @Worker({name: 'workerThread'})
    loadBlogByField(field: any, value: any): Q.Promise<any> {
        var blog: blog;
        console.log("Value returned...... ******** .......");
        return Q.nbind(fs.writeFile,fs)(field,value).then(ret=>{
            return ret;
        });
        // return this.blogRepo.findByField("name", value).then((blog) => {
        //     return blog.name;
        // });
    };


    // @Worker({name: 'workerThread'})
       @Worker()
    // @Worker({name: 'workerThread', workerParams:{workerName:'', serviceName:'' ,servicemethodName:'',
    // arguments:["/Users/asishs/Projects/Node-Data/Enhancement_On_Node_Data/Node-Data/spec/OutputFiles/file.txt","Hello"]}})
    writeBlog(fileName: any, data: any): Q.Promise<any> {
        var blog: blog;
        console.log("file name:" + fileName + " and data: "+ data);
        console.log("Value returned...... ******** .......");
        return Q.nbind(fs.writeFile,fs)(fileName,data).then(ret=>{
            console.log('file writing error'+ret);
            return ret;
        });
    };
}