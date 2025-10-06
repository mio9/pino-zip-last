import fs from 'node:fs'
import path from 'node:path'
import { once } from 'events'
import { pipeline } from 'node:stream'
import { createGzip } from 'node:zlib'

/**
 * Ensure the directory exists. If it does not, create it recursively.
 */
function ensureDirectoryExists(dirPath) {
	try {
		fs.mkdirSync(dirPath, { recursive: true })
	} catch (error) {
        console.log(`Error creating directory ${dirPath}`, error)
	}
}

/**
 * Gzip old log files in the provided directory.
 */
async function gzipOldLogsInDirectory(logsDir) {
	let entries
	try {
		entries = fs.readdirSync(logsDir, { withFileTypes: true })
	} catch (error) {
		console.log(`Error reading directory ${logsDir}`, error)
		return
	}

	const tasks = []
	for (const entry of entries) {
		if (!entry.isFile()) continue
		const filename = entry.name
		const lower = filename.toLowerCase()
		if (!lower.endsWith('.log')) continue

		const sourcePath = path.join(logsDir, filename)
		// Skip empty files to avoid producing empty archives
		let stats
		try {
			stats = fs.statSync(sourcePath)
		} catch (error) {
			console.log(`Error getting stats for ${sourcePath}`, error)
			continue
		}
		if (!stats.isFile() || stats.size === 0) continue

		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, '-')
		const gzName = `${timestamp}.log.gz`
		const destPath = path.join(logsDir, gzName)

		const task = new Promise((resolve) => {
			pipeline(
				fs.createReadStream(sourcePath),
				createGzip({ level: 9 }),
				fs.createWriteStream(destPath),
				(err) => {
					if (!err) {
						try { fs.unlinkSync(sourcePath) } catch (_) {}
					}
					resolve()
				}
			)
		})
		tasks.push(task)
	}

	await Promise.allSettled(tasks)
}

export default async (options) => {
	// Ensure a dedicated logs directory exists and archive any existing files there
	const logsDir = path.resolve(options.destination.split('/').slice(0, -1).join('/'))
	ensureDirectoryExists(logsDir)
	await gzipOldLogsInDirectory(logsDir)

	// Ensure the destination's directory exists as well
	const destinationPath = path.isAbsolute(options.destination)
		? options.destination
		: path.resolve(process.cwd(), options.destination)
	ensureDirectoryExists(path.dirname(destinationPath))


	const stream = fs.createWriteStream(destinationPath, { flags: 'a' })
	await once(stream, 'open')
	return stream
}