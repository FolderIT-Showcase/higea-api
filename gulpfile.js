var bowerFiles = require('main-bower-files'),
    gulp = require('gulp'),
    inject = require('gulp-inject'),
    rename = require('gulp-rename'),
    minify = require('gulp-minify'),
    htmlmin = require('gulp-htmlmin'),
    cleanCSS = require('gulp-clean-css'),
    pm2 = require('pm2'),
    exists = require('path-exists').sync;

var config = require('./config'),
    logger = require('tracer').colorConsole(config.loggerFormat);

var bowerFilesMin = bowerFiles().map((path, index, arr) => {
    var newPath = path.replace(/.([^.]+)$/g, '.min.$1');
    return exists(newPath) ? newPath : path;
});

// process.on('uncaughtException', (err) => {
//     logger.error(err.message);
//     logger.debug(err.stack);
// });

gulp.task('frontend', () => {
    var cssFiles = gulp.src(['./frontend/**/*.css'])
        // .pipe(cleanCSS({ compatibility: 'ie8', level: 2 }))
        // .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('./public'));

    var jsFiles = gulp.src(['./frontend/**/*.js'])
        // .pipe(minify({ ext: { min: '.min.js' }, noSource: true, ignoreFiles: ['.min.js'] }))
        .pipe(gulp.dest('./public'));

    gulp.src('./frontend/src.html')
        .pipe(inject(gulp.src(bowerFilesMin, { read: false }), { name: 'bower' }))
        .pipe(inject(cssFiles, { ignorePath: 'public' }))
        .pipe(inject(jsFiles, { ignorePath: 'public' }))
        .pipe(rename('index.html'))
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest('./public'));

    gulp.src(['./frontend/**/*.html', '!./frontend/src.html'])
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest('./public'));

    gulp.src(['./frontend/assets/**', '!./frontend/assets/**/*.css', '!./frontend/assets/**/*.js'])
        .pipe(gulp.dest('./public/assets'));
});

gulp.task('default', ['frontend'], () => {
    gulp.watch(['./frontend/**/*.html', './frontend/**/*.js', './frontend/**/*.css'], () => {
        gulp.run("frontend");
    });

    pm2.connect(false, (err) => {
        if (err) {
            logger.error(err);
        }

        pm2.delete("higea-api", (err) => {
            if (err) {
                logger.error(err);
            }

            pm2.start("./ecosystem.json", (err) => {
                if (err) {
                    logger.error(err);
                }

                pm2.streamLogs('all', 0);
            });
        });
    });
});

gulp.task('dev', ['frontend'], () => {
    gulp.watch(['./frontend/**/*.html', './frontend/**/*.js', './frontend/**/*.css'], () => {
        gulp.run("frontend");
    });

    pm2.connect(true, (err) => {
        if (err) {
            logger.error(err);
        }

        pm2.delete("higea-api", (err) => {
            if (err) {
                logger.error(err);
            }

            pm2.start("./ecosystem.json", (err) => {
                if (err) {
                    logger.error(err);
                }

                pm2.streamLogs('all', 0);
            });
        });
    });
});
