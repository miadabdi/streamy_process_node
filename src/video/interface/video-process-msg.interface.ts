import { BUCKET_NAMES_TYPE } from '../../common/constants';

export interface SubProcessMsg {
	id: number;
	langRFC5646: string;
	fileId: number;
	filePath: string;
	bucketName: BUCKET_NAMES_TYPE;
	sizeInByte: number;
	mimetype: string;
}

export interface VideoProcessMsg {
	videoId: number;
	fileId: number;
	bucketName: BUCKET_NAMES_TYPE;
	filePath: string;
	sizeInByte: number;
	mimetype: string;
	subs: SubProcessMsg[];
}
