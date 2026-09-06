# Streamy Process Node

This is the ffmpeg worker of the [Streamy](https://github.com/miadabdi/streamy) video-sharing platform.

### Todo

- [ ] complete tests
- [ ] implement log aggregation
- [ ] live stream handling: `srsOnUnpublish`/`on_play`/`on_stop` are stubs on the api side; no end-of-stream cleanup of the live transcode or its files
- [ ] live transcode args contain a literal unevaluated `-bufsize:v:0 2*2000000` (arithmetic is not expanded)
- [ ] ffmpeg is spawned with `shell: true` and one interpolated argument string — paths with spaces or shell metacharacters would break it; values are server-generated today but an argument-array spawn would be safer
- [ ] transcode progress is parsed from ffmpeg stderr but only logged locally; consider reporting it via `q.set.video.status`
- [ ] consider a shared package for queue names (`q.*`) instead of duplicating constants with the streamy repo

### Done ✓

- [x] setup rabbitmq connection (consumes q.video.process / q.live.process, publishes q.set.video.status)
- [x] dead-letter failed queue messages instead of acking them (dlx / q.dead_letter)
- [x] health endpoints + swagger
- [x] multi-stage dockerfile; runs as `process_node` in the streamy compose stack
- [x] resolve ffmpeg/ffprobe from env (FFMPEG_PATH/FFPROBE_PATH) — prod builds no longer break
