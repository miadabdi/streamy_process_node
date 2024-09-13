#!/bin/sh
# This is a comment!
echo Setup started

mkdir -p ./binaries

echo Downloading FFmpeg
wget -c https://www.johnvansickle.com/ffmpeg/old-releases/ffmpeg-6.0.1-amd64-static.tar.xz -O ffmpeg-6.0.1-amd64-static.tar.xz
echo Download completed

echo extracting...
tar -xJf ffmpeg-6.0.1-amd64-static.tar.xz --overwrite
cp -rf ./ffmpeg-6.0.1-amd64-static/* ./binaries
rmdir -rf ffmpeg-6.0.1-amd64-static

echo Deleting tar file 
rm ffmpeg-6.0.1-amd64-static.tar.xz

echo Installing dependencies
npm i

echo DONE
