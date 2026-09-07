# Streamy Process Node

This is the ffmpeg worker of the [Streamy](https://github.com/miadabdi/streamy) video-sharing platform.

### Todo

- [ ] complete tests
- [ ] live hls is only uploaded when the stream ends (replay); serving segments during a live broadcast needs continuous upload
- [ ] implement log aggregation
- [ ] transcode progress is parsed from ffmpeg stderr but only logged locally; consider reporting it via `q.set.video.status`

### Done ✓

- [x] setup rabbitmq connection (consumes q.video.process / q.live.process, publishes q.set.video.status)
- [x] dead-letter failed queue messages instead of acking them (dlx / q.dead_letter)
- [x] health endpoints + swagger
- [x] multi-stage dockerfile; runs as `process_node` in the streamy compose stack
- [x] resolve ffmpeg/ffprobe from env (FFMPEG_PATH/FFPROBE_PATH) — prod builds no longer break
- [x] ffmpeg spawned with an argument array (no shell); live bufsize arithmetic computed
- [x] end-of-stream handling: recording uploaded as a replay, local files cleaned, done status published
- [x] queue names come from the shared @miadabdi/streamy-queues package (vendored tarball)
