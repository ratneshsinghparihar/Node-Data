var gulp = require("gulp");
var tsc = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var nodemon = require('gulp-nodemon');
var livereload = require('gulp-livereload');


var tsProject = tsc.createProject('tsconfig.json', { sortOutput: true });

// gulp.task('generate-schema-task', function() {
//   //foreach entity in models folder
//     var stream = source('file.txt');
//
//     stream.end('some data');
//     stream.pipe(gulp.dest('output'));
// });
//
//
// gulp.task('generate-repositories-task', function() {
//   //foreach IRepository in repository folder
//     var stream = source('file.txt');
//
//     stream.end('some data');
//     stream.pipe(gulp.dest('output'));
// });
//
// gulp.task('generate-controllers-task', function() {
//   //foreach IRepository in repository folder
//     var stream = source('file.txt');
//
//     stream.end('some data');
//     stream.pipe(gulp.dest('output'));
// });


gulp.task('compile-ts', function() {
  var tsResult = tsProject.src()//gulp.src()
                       .pipe(sourcemaps.init())
                       .pipe(tsc(tsProject));

        tsResult.dts.pipe(gulp.dest("./"));
        return tsResult.js
                        .pipe(sourcemaps.write('.'))
                        .pipe(gulp.dest("./"));
});

gulp.task('live-reload', function() {
    gulp.src(["**/*.js", "!node_modules/**/*.*"])
			.pipe(livereload());
});

gulp.task("nodemon",["compile-ts"],function () {
  // listen for changes
	livereload.listen();
	// configure nodemon
	nodemon({
		// the script to run the app
		script: "server.js",
		ext: 'js'
	}).on('start', function(){
		// when the app has restarted, run livereload.
		gulp.src(paths.server)
			.pipe(livereload());
	})
});

gulp.task("watch", function () {
  gulp.watch("./**/*.ts", ["compile-ts", "live-reload"]);
})

// Task
gulp.task('default', ["nodemon","watch"]);
