import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ConsumerService } from '../queue/consumer.service';
import { ProducerService } from '../queue/producer.service';
import { VideoProcessingStatus } from '../video/enum';
import { SetVideoStatusMsg } from '../video/interface';
import { VideoProcessService } from '../video/video-process.service';
import { VideoService } from '../video/video.service';
import { LiveProcessMsg } from './interface';

@Injectable()
export class LiveService {
	private logger = new Logger(LiveService.name);
	private videoFilesDir = join(__dirname, 'liveFiles');

	constructor(
		private videoProcessService: VideoProcessService,
		private videoService: VideoService,
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

			const rtmpUrl = `rtmp://localhost:1935/${message.app}/${message.streamKey}`;
			// give srs a moment to settle before pulling the stream
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// resolves when the rtmp source ends and ffmpeg exits cleanly
			await this.videoProcessService.processLiveVideo(rtmpUrl, dedicatedDir);

			// publish the recording as a replay and clean the local files
			await this.videoService.moveFilesToMinio(dedicatedDir, message.videoId.toString());
			await this.videoService.removeDirectory(dedicatedDir);

			this.producerService.addToQueue('q.set.video.status', {
				videoId: message.id,
				status: VideoProcessingStatus.done,
			} as SetVideoStatusMsg);
		} catch (err: any) {
			let logs = 'no message';
			if (err.logs) logs = err.logs;
			else if (err.message) logs = err.message;

			this.logger.error(`live processing of ${message.streamKey} failed: ${logs}`);

			await this.videoService.removeDirectory(dedicatedDir).catch(() => {});

			this.producerService.addToQueue('q.set.video.status', {
				videoId: message.id,
				status: VideoProcessingStatus.failed_in_processing,
				logs,
			} as SetVideoStatusMsg);
		}
	}
}
