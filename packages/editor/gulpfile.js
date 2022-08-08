const gulp = require('gulp')

gulp.task('copy', function () {
  return gulp.src('./src/assets/**/*').pipe(gulp.dest('./bundles/scss/'))
})

gulp.task('default', gulp.series('copy'))
