import { Injectable, Logger } from '@nestjs/common';
import { MinioService } from 'nestjs-minio-client';
import { BUCKETS } from '../common/constants';

@Injectable()
export class MinioClientService {
	private logger = new Logger(MinioClientService.name);

	constructor(private readonly minio: MinioService) {}

	public get client() {
		return this.minio.client;
	}

	async onModuleInit() {
		for (const bucket of BUCKETS) {
			if (await this.client.bucketExists(bucket.name)) {
				this.logger.log(`Bucket ${bucket.name} exists`);
			} else {
				this.logger.log(`About to create bucket ${bucket.name}`);
				// the api app creates the same buckets concurrently; tolerate the race
				try {
					await this.client.makeBucket(bucket.name, 'default');
					this.logger.log(`Bucket ${bucket.name} created`);
				} catch (err) {
					if (await this.client.bucketExists(bucket.name)) {
						this.logger.log(`Bucket ${bucket.name} already created concurrently`);
					} else {
						throw err;
					}
				}

				this.logger.log(`About to set policy on bucket ${bucket.name}`);
				await this.client.setBucketPolicy(bucket.name, JSON.stringify(bucket.policy));
				this.logger.log(`Policy set on bucket ${bucket.name}`);
			}
		}
	}

	/** cheap availability probe used by the health endpoint */
	async isAvailable(): Promise<boolean> {
		try {
			return await this.client.bucketExists('hls');
		} catch {
			return false;
		}
	}
}
