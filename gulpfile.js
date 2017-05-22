var bowerFiles = require('main-bower-files'),
    gulp = require('gulp'),
    inject = require('gulp-inject'),
    rename = require('gulp-rename'),
    minify = require('gulp-minify'),
    nodemon = require('gulp-nodemon'),
    htmlmin = require('gulp-htmlmin'),
    cleanCSS = require('gulp-clean-css'),
    exists = require('path-exists').sync;

var bowerFilesMin = bowerFiles().map((path, index, arr) => {
    var newPath = path.replace(/.([^.]+)$/g, '.min.$1');
    return exists(newPath) ? newPath : path;
});

gulp.task('frontend', function () {
    var cssFiles = gulp.src(['./frontend/**/*.css', '!./frontend/api/**'])
        .pipe(cleanCSS({ compatibility: 'ie8', level: 2 }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./public'));

    var jsFiles = gulp.src(['./frontend/**/*.js', '!./frontend/api/**'])
        .pipe(minify({ ext: { min: '.min.js' }, noSource: true, ignoreFiles: ['.min.js'] }))
        .pipe(gulp.dest('./public'));

    gulp.src('./frontend/src.html')
        .pipe(inject(gulp.src(bowerFilesMin, { read: false }), { name: 'bower' }))
        .pipe(inject(cssFiles, { ignorePath: 'public' }))
        .pipe(inject(jsFiles, { ignorePath: 'public' }))
        .pipe(rename('index.html'))
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest('./public'));

    gulp.src(['./frontend/api/**'], { read: false })
        .pipe(gulp.dest('./public/api'));

    gulp.src(['./frontend/**/*.html', '!./frontend/api/**', '!./frontend/src.html'])
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest('./public'));

    gulp.src(['./frontend/assets/**', '!./frontend/assets/**/*.css', '!./frontend/assets/**/*.js'], { read: false })
        .pipe(gulp.dest('./public/assets'));
});

gulp.task('default', ['frontend'], function () {
    gulp.watch(['./frontend/**/*.html', './frontend/**/*.js', './frontend/**/*.css'], ['frontend']);

    nodemon({
        script: 'server.js',
        ext: 'js',
        ignore: [
            'public/',
            'frontend/',
            'node_modules/',
            'bower_components/'
        ]
    }).on('restart', function () {
    });
});
