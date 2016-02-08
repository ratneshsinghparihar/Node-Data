function repository(path, model) {
    return function (target) {
        console.log('Repository - Path : ', path);
        target.prototype.path = path;
        target.prototype.model = model;
        //new dynamic.InitRepo(path, repository);
        console.log('Target: ', target);
    };
}
exports.repository = repository;
