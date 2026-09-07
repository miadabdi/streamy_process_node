import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { rm } from 'fs/promises';
import { join } from 'path';
import { MinioClientService } from '../minio-client/minio-client.service';
import { ConsumerService } from '../queue/consumer.service';
import { ProducerService } from '../queue/producer.service';
import { VideoProcessingStatus } from '../video/enum';
import { SetVideoStatusMsg } from '../video/interface';
import { VideoProcessService } from '../video/video-process.service';
import { LiveUploader } from './live-uploader';
import { LiveProcessMsg } from './interface';

@Injectable()
export class LiveService {
	private logger = new Logger(LiveService.name);
	private videoFilesDir = join(__dirname, 'liveFiles');

	constructor(
		private configService: ConfigService,
		private videoProcessService: VideoProcessService,
		private minioClientService: MinioClientService,
		private consumerService: ConsumerService,
		private producerService: ProducerService,
	) {}

	async onModuleInit() {
		await this.consumerService.listenOnQueue('q.live.process', this.processLiveCallback.bind(this));

		if (!existsSync(this.videoFilesDir)) {
			mkdirSync(this.videoFilesDir);
		}
	}

	async processLiveCallback(message: LiveProcessMsg) {
		const dedicatedDir = join(this.videoFilesDir, message.streamKey);

		try {
			mkdirSync(dedicatedDir, { recursive: true });

			const srsHost = this.configService.get<string>('SRS_RTMP_HOST') ?? 'localhost';
			const rtmpUrl = `rtmp://${srsHost}:1935/${message.app}/${message.streamKey}`;
			// give srs a moment to settle before pulling the stream
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// upload segments while the broadcast runs so viewers can watch live
			const uploader = new LiveUploader(
				dedicatedDir,
				message.videoId.toString(),
				this.minioClientService.client,
			);
			const intervalMs = (this.configService.get<number>('LIVE_UPLOAD_INTERVAL') ?? 5) * 1000;
			let ticking = false;
			const watcher = setInterval(() => {
				if (ticking) return;
				ticking = true;
				uploader
					.tick()
					.catch((err) => this.logger.warn(`live upload tick failed: ${err.message}`))
					.finally(() => (ticking = false));
			}, intervalMs);

			try {
				// resolves when the rtmp source ends and ffmpeg exits cleanly
				await this.videoProcessService.processLiveVideo(rtmpUrl, dedicatedDir);
			} finally {
				clearInterval(watcher);
			}

			// ffmpeg has exited: every file is final, push the tail + playlists
			await uploader.flush();
			await this.removeDirectory(dedicatedDir);

			this.producerService.addToQueue('q.set.video.status', {
				videoId: message.id,
				status: VideoProcessingStatus.done,
			} as SetVideoStatusMsg);
		} catch (err: any) {
			let logs = 'no message';
			if (err.logs) logs = err.logs;
			else if (err.message) logs = err.message;

			this.logger.error(`live processing of ${message.streamKey} failed: ${logs}`);

			// best effort: flush whatever was produced so the partial stream is playable
			try {
				const uploader = new LiveUploader(
					dedicatedDir,
					message.videoId.toString(),
					this.minioClientService.client,
				);
				await uploader.flush();
			} catch (flushErr: any) {
				this.logger.error(`live flush on failure also failed: ${flushErr.message}`);
			}
			await this.removeDirectory(dedicatedDir).catch(() => {});

			this.producerService.addToQueue('q.set.video.status', {
				videoId: message.id,
				status: VideoProcessingStatus.failed_in_processing,
				logs,
			} as SetVideoStatusMsg);
		}
	}

	private async removeDirectory(dir: string) {
		await rm(dir, { recursive: true, force: true });
	}
}
