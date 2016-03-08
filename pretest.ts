var fs = require("fs");
var dir = './spec';
var rootdir = './';
var exclude: Array<string> = ["./spec", "./typings", "./bin", "./node_modules", "./obj"];

try {
    deleteFiles(dir);
    addFiles('.', './spec');
}
catch (e) {
    console.log(e);
}

function deleteFiles(path: string) {
    var files = fs.readdirSync(path);
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            var filePath = path + '/' + files[i];
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
            else {
                deleteFiles(filePath);
                fs.rmdirSync(filePath);
            }
        }
    }
}

function addFiles(source, target) {
    var x = exclude.findIndex(x => x == source);
    if (x >= 0) {
        return;
    }

    if (!fs.existsSync(target)) {
        fs.mkdirSync(target);
    }

    var files = fs.readdirSync(source);
    if (files.length > 0) {
        for (var i = 0; i < files.length; i++) {
            if (!files[i].startsWith('.')) {
                try {
                    var filePath = source + '/' + files[i];
                    var tarFile = target + '/' + files[i];
                    if (fs.statSync(filePath).isFile()) {
                        if (files[i].endsWith('.spec.js')) {
                            fs.createReadStream(filePath).pipe(fs.createWriteStream(tarFile));
                        }
                    }
                    else {
                        addFiles(filePath, tarFile);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
    }
}
//# sourceMappingURL=pretest.js.map