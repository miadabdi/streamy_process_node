import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ConsumerService } from '../queue/consumer.service';
import { ProducerService } from '../queue/producer.service';
import { VideoProcessingStatus } from '../video/enum';
import { SetVideoStatusMsg } from '../video/interface';
import { VideoProcessService } from '../video/video-process.service';
import { LiveProcessMsg } from './interface';

@Injectable()
export class LiveService {
	private logger = new Logger(LiveService.name);
	private videoFilesDir = join(__dirname, 'liveFiles');

	constructor(
		private configService: ConfigService,
		private videoProcessService: VideoProcessService,
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
		console.dir(message, { depth: null });

		try {
			const dedicatedDir = join(this.videoFilesDir, message.streamKey);

			mkdirSync(dedicatedDir);

			const rtmpUrl = `rtmp://localhost:1935/${message.app}/${message.streamKey}`;
			setTimeout(() => {
				console.log('reached');
				this.videoProcessService.processLiveVideo(rtmpUrl, dedicatedDir);
			}, 1000);
		} catch (err: any) {
			let logs = 'no message';
			if (err.logs) logs = err.logs;
			else if (err.message) logs = err.message;

			this.producerService.addToQueue('q.set.video.status', {
				videoId: message.id,
				status: VideoProcessingStatus.failed_in_processing,
				logs,
			} as SetVideoStatusMsg);

			return;
		}
	}
}
