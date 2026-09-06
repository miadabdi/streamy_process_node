import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { MinioClientService } from '../minio-client/minio-client.service';
import { ConsumerService } from '../queue/consumer.service';
import { VideoService } from '../video/video.service';

@ApiTags('health')
@Controller('/health')
export class HealthController {
	constructor(
		private consumerService: ConsumerService,
		private minioClientService: MinioClientService,
		private videoService: VideoService,
	) {}

	/** zero external io — must answer while rmq/storage are down */
	@ApiOkResponse({ description: 'Process is alive' })
	@Get('/liveness')
	liveness() {
		return {
			status: 'ok',
			uptime: process.uptime(),
		};
	}

	@ApiOkResponse({ description: 'Dependency and in-flight job state' })
	@Get('/readiness')
	async readiness() {
		return {
			rmq: this.consumerService.isConnected(),
			storage: await this.minioClientService.isAvailable(),
			activeJob: this.videoService.activeJob,
		};
	}
}
