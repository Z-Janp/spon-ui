const gulp = require('gulp')
const sizereport = require('gulp-sizereport')
const gulpSequence = require('gulp-sequence')
const rename = require('gulp-rename')
const gulpif = require('gulp-if')
const htmlmin = require('gulp-htmlmin')
const util = require('gulp-util')
const path = require('path')
const { getTasks } = require('../utils/tasks')
const { buildFractal } = require('./fractal/build')
const { fractalTemplates, exportPaths } = require('./fractal/utils')
const del = require('del')
const { critialCss } = require('./critical')
const { fractal } = require('./fractal')
const { purge } = require('./purge')

function build(cb) {
	if (TASK_CONFIG.mode === 'fractal') {
		if (util.env.config === 'cms') {
			return buildCode(cb)
				.then(() => {
					return fractalTemplates()
				})
				.then(purge)
				.then(() => {
					if (TASK_CONFIG.critical) return critialCss()
					return
				})
				.then(sizeReport)
		} else {
			return buildFractal()
				.then(() => {
					return buildCode(cb)
				})
				.then(() => {
					if (TASK_CONFIG.critical) return critialCss()
					return
				})
		}
	} else {
		return buildCode(cb)
	}
}

function publish(cb) {
	build(cb)
		.then(() => {
			const { html, src } = PATH_CONFIG.publish
			return Promise.all(
				html.map(({ template, name, output }) => {
					return new Promise(resolve => {
						return gulp
							.src(path.resolve(process.env.PWD, src, template))
							.pipe(
								gulpif(
									typeof name !== 'undefined',
									rename({
										basename: name
									})
								)
							)
							.pipe(htmlmin({ collapseWhitespace: true }))
							.pipe(
								gulp.dest(
									path.resolve(
										process.env.PWD,
										PATH_CONFIG.public,
										'_tmp',
										output
									)
								)
							)
							.on('finish', resolve)
					})
				})
			)
		})
		.then(() => {
			return cleanFractal()
		})
		.then(() => {
			return new Promise(resolve => {
				gulp
					.src(path.resolve(process.env.PWD, PATH_CONFIG.public, '_tmp/**'))
					.pipe(gulp.dest(path.resolve(process.env.PWD, PATH_CONFIG.public)))
					.on('finish', resolve)
			})
		})
		.then(() => {
			return del(
				[path.resolve(process.env.PWD, PATH_CONFIG.public, '_tmp/**')],
				{
					force: true
				}
			)
		})
		.then(() => {
			gulp
				.src(path.resolve(process.env.PWD, PATH_CONFIG.public, '**/*'))
				.pipe(
					gulp.dest(path.resolve(process.env.PWD, PATH_CONFIG.publish.public))
				)
		})
}

function buildCode(cb) {
	const { assetTasks, codeTasks } = getTasks()
	assetTasks.push('move-scripts')
	codeTasks.push('bundle-script')
	return new Promise(resolve => {
		gulpSequence('clean:dist', assetTasks, codeTasks, 'cacheBuster', resolve)
	})
}

function cleanFractal() {
	util.log('clean fractal')
	const build = path.resolve(process.env.PWD, PATH_CONFIG.fractal.build)
	return del(
		[
			path.resolve(build, '*.html'),
			path.resolve(build, 'components/**/**'),
			path.resolve(build, 'docs/**/**'),
			path.resolve(build, 'fractal/**/**')
		],
		{
			force: true
		}
	)
}

gulp.task('build', build)
gulp.task('publish', publish)

gulp.task('build:component-map', () => {
	const server = fractal.web.server()
	const logger = fractal.cli.console
	return server.start().then(() => {
		logger.success(
			'Fractal server is alive and well, components being built and json map being generated'
		)
		del(
			[
				path.resolve(
					process.env.PWD,
					PATH_CONFIG.fractal.base,
					PATH_CONFIG.fractal.output,
					'**'
				),
				`!${path.resolve(
					process.env.PWD,
					PATH_CONFIG.fractal.base,
					PATH_CONFIG.fractal.output
				)}`
			],
			{
				force: true
			}
		).then(() => {
			exportPaths(fractal)
				.catch(err => console.log(err))
				.then(fractalTemplates)
				.then(() => {
					server.stop()
					process.exit()
				})
		})
	})
})

gulp.task('clean:dist', () => {
	return del(
		[path.resolve(process.env.PWD, PATH_CONFIG.public, PATH_CONFIG.dist)],
		{
			force: true
		}
	)
})

gulp.task('size-report', sizeReport)

const sizeReport = () =>
	gulp
		.src([
			path.resolve(
				process.env.PWD,
				PATH_CONFIG.public,
				PATH_CONFIG.dist,
				'**/*.css'
			),
			path.resolve(
				process.env.PWD,
				PATH_CONFIG.public,
				PATH_CONFIG.dist,
				'**/*.js'
			),
			'*!rev-manifest.json'
		])
		.pipe(
			sizereport({
				gzip: true
			})
		)
