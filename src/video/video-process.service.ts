import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { join } from 'path';
import handleProgress from '../common/helpers/handle-progress';
import ffprobeVideoInfo from '../common/services/ffprobe-video-info';

const ffmpegPath = join(__dirname, '../../binaries/ffmpeg');

@Injectable()
export class VideoProcessService {
	private logger = new Logger(VideoProcessService.name);

	constructor(private configService: ConfigService) {}

	async onModuleInit() {}

	async processVideo(localfilepath: string, dedicatedDir: string) {
		const info = await ffprobeVideoInfo(localfilepath);
		const videoStream = info.streams.find((stream) => stream.codec_type == 'video');
		if (!videoStream) {
			throw new Error('Video file does not contain video stream');
		}
		const nbFrames = Number(videoStream.nb_frames);

		const threadsCount = this.configService.get<number>('FFMPEG_THREAD_COUNT');
		const niceness = this.configService.get<number>('FFMPEG_NICENESS');
		const args = `-hide_banner -loglevel info -y -threads ${threadsCount} -i ${localfilepath}  -codec:v libx264 -crf:v 23 -profile:v high -pix_fmt:v yuv420p -rc-lookahead:v 40 -force_key_frames:v expr:'gte(t,n_forced*2.000)' -preset:v "veryfast" -b-pyramid:v "strict"   -filter_complex "[0:v]fps=fps=30,split=3[v1][v2][v3];[v1]scale=width=-2:height=1080[1080p];[v2]scale=width=-2:height=720[720p];[v3]scale=width=-2:height=360[360p]"  -map "[1080p]" -maxrate:v:0 2500000 -bufsize:v:0 5000000 -level:v:0 4.0  -map "[720p]" -maxrate:v:1 1700000 -bufsize:v:1 3200000 -level:v:1 3.1  -map "[360p]" -maxrate:v:2 800000 -bufsize:v:2 1600000 -level:v:2 3.1  -codec:a aac -ar 44100 -ac:a 2  -map 0:a:0 -b:a:0 192000  -map 0:a:0 -b:a:1 128000  -map 0:a:0 -b:a:2 96000  -f hls  -hls_flags +independent_segments+program_date_time+single_file  -hls_time 6  -hls_playlist_type vod  -hls_segment_type mpegts  -master_pl_name 'master.m3u8'  -var_stream_map 'v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:360p'  -hls_segment_filename 'segment_%v.ts' 'manifest_%v.m3u8'`;
		let logs = '';

		return new Promise((resolve, reject) => {
			// creating spawn
			const command = spawn(`nice -n ${niceness} ${ffmpegPath}`, [args], {
				shell: true,
				cwd: dedicatedDir,
			});

			command.stderr.on('data', (data) => {
				logs = logs + data;
			});

			command.stderr.on('data', (data) => handleProgress(data, nbFrames));

			command.stdout.on('data', (data) => {
				// stdout is reserved for media streams
				// meaning logs would be output to stderr alongside errors
				// console.log(`stdout: ${data}`);
			});

			command.on('close', (code) => {
				// error should be determined by code
				if (code == 0) {
					console.log(`child process closed with code ${code}`);
					resolve(code);
				} else {
					console.log(`child process closed with code ${code}`);
					reject({ code, logs });
				}
			});

			command.on('error', (err) => {
				// console.log(err);
				// this event is not called on error
			});
		});

		// const threads = 8;
		// const command = ffmpeg(localfilepath, { niceness: 19, cwd: dedicatedDir })
		// 	.addOptions([`-threads ${threads}`])
		// 	.videoCodec('libx264')
		// 	.audioCodec('aac')
		// 	.audioFrequency(44100)
		// 	.audioChannels(2)
		// 	.addOutputOptions([
		// 		'-preset veryfast',
		// 		'-crf:v 23',
		// 		'-profile:v high',
		// 		'-pix_fmt:v yuv420p',
		// 		'-rc-lookahead:v 40',
		// 		"-force_key_frames:v expr:'gte(t,n_forced*2.000)'",
		// 		"-b-pyramid:v 'strict'",
		// 	])
		// 	.complexFilter([
		// 		'[0:v]fps=fps=30,split=3[v1][v2][v3]',
		// 		'[v1]scale=width=-2:height=1080[1080p]',
		// 		'[v2]scale=width=-2:height=720[720p]',
		// 		'[v3]scale=width=-2:height=360[360p]',
		// 	])
		// 	// .addOutputOption(
		// 	// 	'-filter_complex',
		// 	// 	'[0:v]fps=fps=30,split=3[v1][v2][v3]; [v1]scale=width=-2:height=1080[1080p]; [v2]scale=width=-2:height=720[720p]; [v3]scale=width=-2:height=360[360p]',
		// 	// )
		// 	.addOutputOptions([
		// 		`-map [1080p]`,
		// 		`-maxrate:v:0 2500000`,
		// 		`-bufsize:v:0 5000000`,
		// 		`-level:v:0 4.0`,
		// 		`-map [720p]`,
		// 		`-maxrate:v:1 1700000`,
		// 		`-bufsize:v:1 3200000`,
		// 		`-level:v:1 3.1`,
		// 		`-map [360p]`,
		// 		`-maxrate:v:2 800000`,
		// 		`-bufsize:v:2 1600000`,
		// 		`-level:v:2 3.1`,
		// 		`-map 0:a:0`,
		// 		`-b:a:0 192000`,
		// 		`-map 0:a:0`,
		// 		`-b:a:1 128000`,
		// 		`-map 0:a:0`,
		// 		`-b:a:2 96000`,
		// 	])
		// 	.outputFormat('hls')
		// 	.addOutputOptions([
		// 		`-hls_flags +independent_segments+program_date_time+single_file`,
		// 		`-hls_time 6`,
		// 		`-hls_playlist_type vod`,
		// 		`-hls_segment_type mpegts`,
		// 		`-master_pl_name master.m3u8`,
		// 		`-hls_segment_filename segment_%v.ts`,
		// 	])
		// 	.addOutputOption(
		// 		'-var_stream_map',
		// 		"'v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:360p'",
		// 	)
		// 	.output('manifest_%v.m3u8');

		// command.on('start', (cmdline) => {
		// 	console.log(cmdline);
		// });
		// command.on('progress', function (progress) {
		// 	console.info(`vid() Processing : ${progress.percent} % done`);
		// });
		// command.on('codecData', function (data) {
		// 	console.log('vid() codecData=', data);
		// });
		// command.on('end', function () {
		// 	console.log('file has been converted succesfully; resolve() promise');
		// });
		// command.on('error', function (err) {
		// 	console.log('an error happened: ' + err.message, ', reject()');
		// });

		// command.run();
	}

	async processSubtitle(
		videoFilePath: string,
		subFilePath: string,
		dedicatedDir: string,
		langCode: string,
	) {
		const threadsCount = this.configService.get<number>('FFMPEG_THREAD_COUNT');
		const niceness = this.configService.get<number>('FFMPEG_NICENESS');
		const args = `-hide_banner  -threads ${threadsCount} -loglevel info -y -i ${videoFilePath} -i ${subFilePath} -c:v copy -c:s webvtt  -map 0:v  -map 1:s -f hls -hls_time 6 -hls_playlist_type vod -hls_subtitle_path sub_vtt_%v.m3u8 -hls_segment_type mpegts -var_stream_map 'v:0,s:0,name:${langCode},sgroup:subtitle' -hls_segment_filename 'redundant_%v_%04d.ts' sub_vtt_%v.m3u8`;
		let logs = '';

		return new Promise((resolve, reject) => {
			// creating spawn
			const command = spawn(`nice -n ${niceness} ${ffmpegPath}`, [args], {
				shell: true,
				cwd: dedicatedDir,
			});

			command.stderr.on('data', (data) => {
				logs = logs + data;
			});

			command.stdout.on('data', (data) => {
				// stdout is reserved for media streams
				// meaning logs would be output to stderr alongside errors
				// console.log(`stdout: ${data}`);
			});

			command.on('close', (code) => {
				// error should be determined by code
				if (code == 0) {
					console.log(`child process closed with code ${code}`);
					resolve(code);
				} else {
					console.log(`child process closed with code ${code}`);
					reject({ code, logs });
				}
			});

			command.on('error', (err) => {
				// console.log(err);
				// this event is not called on error
			});
		});
	}

	async processLiveVideo(rtmpUrl: string, dedicatedDir: string) {
		const threadsCount = this.configService.get<number>('FFMPEG_THREAD_COUNT');
		const niceness = this.configService.get<number>('FFMPEG_LIVE_NICENESS');
		const args = `-hide_banner -loglevel info -y -threads ${threadsCount} -i ${rtmpUrl} -filter_complex "[0:v]fps=fps=30,split=3[v1][v2][v3];[v1]scale=width=-2:height=1080[1080p];[v2]scale=width=-2:height=720[720p];[v3]scale=width=-2:height=360[360p]" -codec:v libx264 -crf:v 23 -tune zerolatency -pix_fmt:v yuv420p -rc-lookahead:v 60 -force_key_frames:v expr:'gte(t,n_forced*2.000)' -preset:v "fast" -b-pyramid:v "strict"  -map [1080p] -maxrate:v:0 2000000 -bufsize:v:0 2*2000000 -level:v:0 4.0 -map [720p] -maxrate:v:1 1200000 -bufsize:v:1 2*1000000 -level:v:1 3.1 -map [360p] -maxrate:v:2 700000 -bufsize:v:2 2*500000 -level:v:2 3.1 -codec:a aac -ac:a 2 -map 0:a:0 -b:a:0 192000 -map 0:a:0 -b:a:1 128000 -map 0:a:0 -b:a:2 96000 -f hls -hls_flags +independent_segments -hls_time 6 -hls_playlist_type event -hls_segment_type mpegts -master_pl_name 'master.m3u8' -var_stream_map 'v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:360p' -hls_segment_filename 'segment_%v_%05d.ts' 'manifest_%v.m3u8'`;
		let logs = '';

		console.log(dedicatedDir);

		return new Promise((resolve, reject) => {
			// creating spawn
			const command = spawn(`nice -n ${niceness} ${ffmpegPath}`, [args], {
				shell: true,
				cwd: dedicatedDir,
			});

			command.stderr.on('data', (data) => {
				console.log('/////// stderr data', data);
				logs = logs + data;
			});

			// command.stderr.on('data', (data) => handleProgress(data, nbFrames));

			command.stdout.on('data', (data) => {
				// stdout is reserved for media streams
				// meaning logs would be output to stderr alongside errors
				// console.log(`stdout: ${data}`);
			});

			command.on('close', (code) => {
				// error should be determined by code
				if (code == 0) {
					console.log(`child process closed with code ${code}`);
					resolve(code);
				} else {
					console.log(`child process closed with code ${code}`);
					reject({ code, logs });
				}
			});

			command.on('error', (err) => {
				console.log(err);
				// this event is not called on error
			});
		});
	}
}
