import { buildLiveArgs, buildSubtitleArgs, buildVodArgs } from './ffmpeg-args';

describe('ffmpeg argument builders', () => {
	it('builds vod args as separate argv elements without shell quoting', () => {
		const args = buildVodArgs('/tmp/v/video.mp4', 8);

		expect(args[0]).toBe('-hide_banner');
		expect(args).toContain('/tmp/v/video.mp4');
		// the filter graph and stream map are single argv elements despite spaces
		expect(args).toContain(
			'[0:v]fps=fps=30,split=3[v1][v2][v3];[v1]scale=width=-2:height=1080[1080p];[v2]scale=width=-2:height=720[720p];[v3]scale=width=-2:height=360[360p]',
		);
		expect(args).toContain('v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:360p');
		// no shell-quoting artifacts, no empty elements
		for (const arg of args) {
			expect(arg).not.toMatch(/^['"]|['"]$/);
			expect(arg.length).toBeGreaterThan(0);
		}
	});

	it('builds subtitle args with the language inside the stream map', () => {
		const args = buildSubtitleArgs('/tmp/v/video.mp4', '/tmp/v/sub.srt', 'en', 4);

		expect(args).toContain('v:0,s:0,name:en,sgroup:subtitle');
		expect(args).toContain('redundant_%v_%04d.ts');
		expect(args.filter((a) => a === '-i')).toHaveLength(2);
	});

	it('builds live args with computed bufsize values', () => {
		const args = buildLiveArgs('rtmp://localhost:1935/live/key', 8);

		// the old shell string passed "2*2000000" literally; computed values now
		expect(args).toContain('4000000');
		expect(args).toContain('2000000');
		expect(args).toContain('1000000');
		expect(args.join(' ')).not.toContain('2*');
		expect(args).toContain('-tune');
		expect(args).toContain('zerolatency');
	});

	it('places every flag value as its own element', () => {
		for (const args of [
			buildVodArgs('v.mp4', 8),
			buildSubtitleArgs('v.mp4', 's.srt', 'en', 8),
			buildLiveArgs('rtmp://x', 8),
		]) {
			for (const arg of args) {
				expect(arg.trim()).toBe(arg);
				// no flag glued into another token (run-together shell words)
				expect(arg).not.toMatch(/\s-/);
			}
			// thread count arrives as its own element
			expect(args).toContain('8');
		}
	});
});
