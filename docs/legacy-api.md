# csPlayer
A custom youtube video player, based on Javascript.

See [demo source](demo/demo.html). To try this fork locally, run
`python3 -m http.server 8000` from the repository and open
`http://localhost:8000/demo/demo.html`.

## Installing
Firstly, include YouTube iframe api script in your document.
```html
<script src="https://www.youtube.com/iframe_api"></script>
```
Place this script before any script in head tag to load it faster.

Now include `csPlayer` files in the document.
You can use the files available above in `src` folder.
```html
<link rel="stylesheet" href="csPlayer.css">
<script src="csPlayer.js"></script>
```
or use them Via CDN:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/jschof1/csPlayer@main/src/csPlayer.css">
<script src="https://cdn.jsdelivr.net/gh/jschof1/csPlayer@main/src/csPlayer.js"></script>
```

## Methods
- init()
- changeVideo()
- play()
- pause()
- getDuration()
- getCurrentTime()
- getVideoTitle()
- getPlayerState()
- Initialized()
- destroy()

### 1. init()
This will initiate csPlayer in the document.
```js
csPlayer.init("video",{
defaultId: "RKERYQwvlFw",
thumbnail: true,
theme: "default",
loop: false,
});
```
1st parameter is the id of the element for player element in video player is going to play. **NOTE** : This should be unique in document.

2nd parameter contains various parameters, that are: 
#### (i) defaultId
This is the default youtube video id through which player player would be loaded, and this is mandate.
#### (ii) thumbnail
It will take the boolean values `true or false` or also you can give url for the custom thumbnail.
#### (iii) theme
This will take the values of the themes available at csPlayer by default. Some of them are `youtube`,`plyr` and `default`.
[Check available themes](demo/demo.html).
#### (iv) loop
This will take boolean values `true` or `false`.

`init()` waits for the YouTube API and resolves once the player and controls are
ready. It rejects if the API fails to load within 15 seconds or the player reports
an initialization error. Playback starts only after a user action; initialization
does not autoplay. Use `.then()` to perform an action after initialization.
```js
csPlayer.init("video",{
defaultId: "RKERYQwvlFw",
thumbnail: true,
theme: "default",
loop: false,
})
.then(()=>{
console.log("Player Initialized");
})
.catch((error)=>{
console.log("Error", error);
});
```

### 2. changeVideo()
This will change the video of the current player.
```js
csPlayer.changeVideo("video","kJQP7kiw5Fk");
```
1st parameter is the id of the element for player.
2nd parameter is the video id of the youtube video.

### 3. play()
This is use to play the video.
```js
csPlayer.play("video")
```
Given parameter is the id of the element for player.

Call `play()` from a user click after `init()` resolves. It works on first playback,
including when the player is muted. Browsers may block playback without a user
gesture. The central Play icon also supports Enter and Space.

### 4. pause()
This is use to pause the video.
```js
csPlayer.pause("video")
```
Given parameter is the id of the element for player.

### 5. getDuration()
This will return duration of the video.
```js
var x = csPlayer.getDuration("video")
console.log(x); //eg: 490
```
Given parameter is the id of the element for player.
It will return duration time in seconds.

### 6. getCurrentTime()
This will return current time of the video.
```js
var x = csPlayer.getCurrentTime("video")
console.log(x); //eg: 176
```
Given parameter is the id of the element for player.
It will return duration time in seconds.

### 7. getVideoTitle()
This will return title of the youtube video.
```js
var x = csPlayer.getVideoTitle("video")
console.log(x);
```
Given parameter is the id of the element for player.

### 8. getPlayerState()
This will return current state of the video i.e. `playing`,`paused`,`buffering`,`cued` or `ended`.
```js
var x = csPlayer.getPlayerState("video")
console.log(x); //eg: playing
```
Given parameter is the id of the element for player.

### 9. initialized()
This is use to check if video is initialized or not.
```js
var x = csPlayer.initialized("video")
console.log(x); //eg: true
```
Given parameter is the id of the element for player.
It will return true or false.

### 10. destroy()
This is use to destroy the current player.
```js
csPlayer.destroy("video")
```
**NOTE** : It will remove the player inside the element(i.e. video) not the entire element from the document.

## CSS customization
csPlayer can be customized through css variables. This is the list of available variables.
- --playerBg
- --playerColor
- --playerBR
- --startLoaderColor
- --startBtnSize
- --startBtnBg
- --startBtnIconColor
- --playPauseIconColor
- --forwardIconColor
- --backwardIconColor
- --sliderBg
- --sliderThumbSize
- --sliderThumbColor
- --sliderSeekTrackColor
- --sliderLoadedTrackColor
- --currentTimeTextColor
- --durationTextColor
- --settingsBtnColor
- --fullscreenBtnColor
- --settingsBg
- --settingsTextColor
- --settingsInputIconBg
- --settingsInputIconColor
```css
#video .csPlayer{
--playerBg: #000;
--playerColor: #fff;
--settingsBg: #181818:
}
```
You can create player custom theme from it.
**NOTE**: give these values inside `.csPlayer`

## Full Example
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <script src="https://www.youtube.com/iframe_api"></script>
    <link rel="stylesheet" href="csPlayer.css">
    <title>csPlayer</title>
</head>
<body>
<div id="video"></div>

<script src="csPlayer.js"></script>
<script>
csPlayer.init("video",{
defaultId: "RKERYQwvlFw",
thumbnail: true,
theme: "default",
loop: false,
})
</script>
</body>
</html>
```

## Demo
[Check demo source for full customization](demo/demo.html)

## Regression checks
Run `node --test tests/playback.test.cjs` (Node.js 18+). These dependency-free
checks simulate YouTube lifecycle events, including iframe load before `onReady`,
delayed API loading, first playback, pause/resume, keyboard activation, and
multiple players. Verify real YouTube playback separately in the browser demo.

## Screenshots
![screenshots](https://i.ibb.co/928j3QH/20241001-213604.jpg)
