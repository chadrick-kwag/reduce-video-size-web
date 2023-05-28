# video size reducer

## how to use

- run backend server
```bash
node server.js
```

- run frontend server
```bash
npx webpack serve
```

## requirements

- nodejs
- install necessary node packages
- ffmpeg
    - recommend download from https://github.com/BtbN/FFmpeg-Builds/releases
    - ensure ffmpeg binary files is searchable with `PATH` env variable.

## how it works

the backend server(`server.js`) takes care of finding target files under given directories to search for, manage work queue which does the actual vidoe conversion one at a time. 

the frontend server takes care of showing the current work status of video conversion, and allow to add/remove files to convert. The frontend will poll to backend server to fetch work status and show updates.