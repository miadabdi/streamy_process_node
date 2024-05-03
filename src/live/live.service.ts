import { ForbiddenException, Injectable } from '@nestjs/common';
import { OnPublishDto } from './dto/on-publish.dto';

@Injectable()
export class LiveService {
	srsOnPublish(srsOnPublishDto: OnPublishDto) {
		if (srsOnPublishDto.app != 'live') {
			throw new ForbiddenException('Only live app is allowed');
		}

		console.dir(srsOnPublishDto, { depth: null });
		return { code: 0 };
	}

	srsOnUnpublish(srsOnUnpublishDto: any) {
		console.dir(srsOnUnpublishDto, { depth: null });
		return { code: 0 };
	}

	srsOnPlay(srsOnPlayDto: any) {
		console.dir(srsOnPlayDto, { depth: null });
		return { code: 0 };
	}

	srsOnStop(srsOnStopDto: any) {
		console.dir(srsOnStopDto, { depth: null });
		return { code: 0 };
	}
}
