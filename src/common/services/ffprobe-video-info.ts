import ffmpeg, { FfprobeData } from 'fluent-ffmpeg';
import { join } from 'path';

const ffprobePath = join(__dirname, '../../../binaries/ffprobe');
ffmpeg.setFfprobePath(ffprobePath);

export default function ffprobeVideoInfo(filepath: string): Promise<FfprobeData> {
	return new Promise((resolve, reject) => {
		ffmpeg.ffprobe(filepath, (err: any, data: FfprobeData) => {
			if (err) {
				reject(err);
			}

			resolve(data);
		});
	});
}
