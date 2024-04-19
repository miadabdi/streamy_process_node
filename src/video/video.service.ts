import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BUCKET_NAMES_TYPE } from '../common/constants';
import { MinioClientService } from '../minio-client/minio-client.service';
import { ConsumerService } from '../queue/consumer.service';
import { ProducerService } from '../queue/producer.service';
import { VideoProcessingStatus } from './enum';
import { SetVideoStatusMsg } from './interface';
import { VideoProcessMsg } from './interface/video-process-msg.interface';
import { VideoProcessService } from './video-process.service';

@Injectable()
export class VideoService {
	private logger = new Logger(VideoService.name);
	private videoFilesDir = join(__dirname, 'videoFiles');

	constructor(
		private consumerService: ConsumerService,
		private minioClientService: MinioClientService,
		private videoProcessService: VideoProcessService,
		private producerService: ProducerService,
	) {}

	async onModuleInit() {
		await this.consumerService.listenOnQueue(
			'q.video.process',
			this.processVideoCallback.bind(this),
		);

		if (!existsSync(this.videoFilesDir)) {
			mkdirSync(this.videoFilesDir);
		}
	}

	async downloadVideoFile(bucket: BUCKET_NAMES_TYPE, filePath: string, dirName: string) {
		const dedicatedDir = join(this.videoFilesDir, dirName);
		const localfilepath = join(dedicatedDir, filePath);

		console.log(__dirname, localfilepath);
		try {
			await this.minioClientService.client.fGetObject(bucket, filePath, localfilepath);
		} catch (err) {
			this.logger.error(`Error happend during download of ${filePath} of bucket ${bucket}`);
			this.logger.error(err);
		}

		return { localfilepath, dedicatedDir };
	}

	async processVideoCallback(message: VideoProcessMsg) {
		console.dir(message, { depth: null });
		const { localfilepath, dedicatedDir } = await this.downloadVideoFile(
			message.bucketName,
			message.filePath,
			message.videoId.toString(),
		);

		this.producerService.addToQueue('q.set.video.status', {
			videoId: message.videoId,
			status: VideoProcessingStatus.processing,
		} as SetVideoStatusMsg);

		try {
			await this.videoProcessService.processVideo(localfilepath, dedicatedDir);

			this.producerService.addToQueue('q.set.video.status', {
				videoId: message.videoId,
				status: VideoProcessingStatus.done,
			} as SetVideoStatusMsg);
		} catch (err: any) {
			let logs = 'no message';
			if (err.logs) logs = err.logs;
			else if (err.message) logs = err.message;

			this.producerService.addToQueue('q.set.video.status', {
				videoId: message.videoId,
				status: VideoProcessingStatus.failed_in_processing,
				logs,
			} as SetVideoStatusMsg);

			return;
		}
	}
}
