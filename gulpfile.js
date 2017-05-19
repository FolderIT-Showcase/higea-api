var bowerFiles = require('main-bower-files'),
    gulp = require('gulp'),
    inject = require('gulp-inject'),
    rename = require('gulp-rename'),
    nodemon = require('gulp-nodemon');

gulp.task('frontend', function () {
    var cssFiles = gulp.src(['./frontend/**/*.css', '!./frontend/api/**'])
        .pipe(gulp.dest('./public'));

    var jsFiles = gulp.src(['./frontend/**/*.js', '!./frontend/api/**'])
        .pipe(gulp.dest('./public'));

    gulp.src('./frontend/src.html')
        .pipe(inject(gulp.src(bowerFiles(), { read: false }), { name: 'bower' }))
        .pipe(inject(cssFiles, { ignorePath: 'public' }))
        .pipe(inject(jsFiles, { ignorePath: 'public' }))
        .pipe(rename('index.html'))
        .pipe(gulp.dest('./public'));

    gulp.src(['./frontend/api/**'])
        .pipe(gulp.dest('./public/api'));

    gulp.src(['./frontend/**/*.html', '!./frontend/api/**', '!./frontend/src.html'])
        .pipe(gulp.dest('./public'));

    gulp.src(['./frontend/assets/**'])
        .pipe(gulp.dest('./public/assets'));
});

gulp.task('default', ['frontend'], function () {
    gulp.watch('./frontend/**/*.html', ['frontend']);

    nodemon({
        script: 'server.js',
        ext: 'js',
        ignore: [
            'public/',
            'node_modules/',
            'bower_components/'
        ]
    }).on('restart', function () {
        // gulp.start('frontend');
    });
});
