import { ForbiddenException, Injectable } from '@nestjs/common';
import { OnPlayDto, OnPublishDto, OnStopDto, OnUnpublishDto } from './dto';

@Injectable()
export class LiveService {
	srsOnPublish(srsOnPublishDto: OnPublishDto) {
		if (srsOnPublishDto.app != 'live') {
			throw new ForbiddenException('Only live app is allowed');
		}

		console.dir(srsOnPublishDto, { depth: null });
		return { code: 0 };
	}

	srsOnUnpublish(srsOnUnpublishDto: OnUnpublishDto) {
		console.dir(srsOnUnpublishDto, { depth: null });
		return { code: 0 };
	}

	srsOnPlay(srsOnPlayDto: OnPlayDto) {
		console.dir(srsOnPlayDto, { depth: null });
		return { code: 0 };
	}

	srsOnStop(srsOnStopDto: OnStopDto) {
		console.dir(srsOnStopDto, { depth: null });
		return { code: 0 };
	}
}
