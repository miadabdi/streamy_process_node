# Streamy Process Node

This is a process node for [Streamy](https://github.com/miadabdi/streamy).
The reason for a dedicated process node, is to have any number of processing node on seperate server decoupled from user request handling.

# How It Works

![streamy architecture](Streamy.drawio.png)
This project is streamy, responsible for handling user requests, anything related to video creation, channel, comment, profile, ....

There is a different project, [Streamy Process Node](https://github.com/miadabdi/streamy_process_node) responsible for running long processes. When a new video is uploaded, a message is transferred from streamy to node, containing details about the video, node will download the video from minio and start processing and transcoding the video to HLS.
ALSO, when a new stream hits SRS, it would hand it to node, which will also transcode it into HLS.

## Installation

There is a docker compose file in the project, to use it you must already have docker installed.

### Step 1: Fill out the env file

Pretty much all the env files are required.
Rename `app.env.example` to `app.env` and `.env.example` to `.env`

There are explanations for each env variable, so check the file out.
`.env` is used in docker compose file.
`app.env` is the primary env file used in the app.

### Step 2: Start up dependencies

Run compose file:

```
sudo docker compose up -d
```

### Step 3: Install packages and run the app

```bash
npm install
npm start
```

app is available on any port specified on `app.env`. you can route traffic using nginx.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
