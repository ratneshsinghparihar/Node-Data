import * as dynamic from '../dynamic/dynamic';

export function repository(path: string, model: Function) {

    return function (target: Function) {
        console.log('Repository - Path : ', path);
        target.prototype.path = path;
        target.prototype.model = model;
        //new dynamic.InitRepo(path, repository);
        console.log('Target: ', target);   
             
    };
}
