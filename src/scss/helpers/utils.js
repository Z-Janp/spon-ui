import ms from 'modularscale-js'

export function px2rem(input, base = 16) {
	const regExVal = new RegExp(/\d+/, 'g')
	return regExVal.exec(input) / base + 'rem'
}

export function calc(min, max, start, stop) {
	return `calc(${min} + (${max} - ${min}) * ((100vw - ${start}) / (${stop} - ${start})))`
}

export const ms2rem = (
	n,
	settings = {
		base: 16,
		ratio: 1.125
	}
) => px2rem(ms(n, settings))

export function msRange(
	start,
	end,
	settings = {
		base: 16,
		ratio: 1.125
	}
) {
	const length = end + 1 - start
	return Array.from({ length: length }).reduce((acc, cur, i) => {
		acc[`ms${start + i}`] = px2rem(ms(start + i, settings))
		return acc
	}, {})
}

export const gutter = (n = 1, size = 20) => px2rem(n * size)

export function rgba(hex, opacity = 1) {
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
		hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b)
	)

	return result
		? `rgba(${result
			.splice(1)
			.map(n => parseInt(n, 16))
			.join(',')}, ${opacity})`
		: null
}

export function rgbaRange(hex, name = 'black', prefix = 'pc') {
	return Array.from({ length: 9 })
		.map((_, i) => rgba(hex, (i + 1) / 10))
		.reduce((a, c, i) => {
			a[`${name}-${(i + 1) * 10}${prefix}`] = c
			return a
		}, {})
}
