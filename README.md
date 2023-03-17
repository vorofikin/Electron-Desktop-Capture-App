# Electron, Ffmpeg, Bootstrap

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn install

# npm
npm install
```

## Run app

```bash
yarn start
```

## Production

Build the application for production:

```bash
yarn make
```
## Description

On the **first** start of the app it will create <code>runtime_config.json</code>.
It will contain all user settings.

### Settings:

You can configure:

> 1. **Recording path** - choose a folder where you want to save a recording;
> 2. **Recording format** (<code>'webm', 'mp4', 'avi'</code>) - choose a video format;
> 3. **Separate audio and video** - if you record video that contains audio
   you can save audio and video in separate files.
> 4. **What to record** (<code>'Only Audio', 'Only Video', 'Audio & Video'</code>)
> 5. **Output resolution** (<code>'1920x1080', '640x480', '320x240', '320x200'</code>) - you can choose resolution for your output video
