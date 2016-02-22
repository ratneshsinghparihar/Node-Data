import {onetomany, manytoone, manytomany} from '../decorators/association';
import {document} from '../decorators/document';
import {field} from '../decorators/field';
import {IBlog} from './blog.ts';

@document({ name: 'blogs', isStrict: false })
export class BlogModel{
    @field({isPrimary: true, isAutogenerated: true})
    _id: any;
    
    @field()
    name: any;
    
    //@manytoone({rel: 'users'})
    //users: Array<UserModel>;

    constructor(blogDto: IBlog) {
        this._id = blogDto._id;
        this.name = blogDto.name;
    }
}
