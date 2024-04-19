import { VideoProcessingStatus } from '../enum';

export interface SetVideoStatusMsg {
	videoId: number;
	status: VideoProcessingStatus;
	logs: string;
}
