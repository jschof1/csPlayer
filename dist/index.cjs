'use strict';
//custom script 
function $(selector,parent){
var x;
try{
const elements = document.querySelectorAll(selector);
if(elements.length == 1){x = elements[0]}
else if(elements.length == 0){x = null}
else{x = elements}
}catch(error){
x = error;
}return x;
}


var csPlayer ={
csPlayers : Object.create(null),
waitForYouTube:(entry)=>{
return new Promise((resolve, reject)=>{
const deadline = Date.now() + 15000;
function check(){
if(entry?.cancelled){ reject(new Error("Player destroyed before readiness.")); return; }
if(typeof YT !== "undefined" && typeof YT.Player === "function"){
resolve();
}else if(Date.now() >= deadline){
reject(new Error("YouTube iframe API did not load. Include https://www.youtube.com/iframe_api before initializing csPlayer."));
}else{
setTimeout(check,50);
}}
check();
});
},
preSetup: (videoTag,playerTagId,defaultId)=>{
var theme =("theme" in csPlayer.csPlayers[videoTag]["params"]) ? csPlayer.csPlayers[videoTag]["params"]["theme"] : null;
var themeClass = theme ? "theme-"+theme : "";
    return new Promise((resolve, reject) => {
    $("#"+videoTag).innerHTML =`
      <div class="csPlayer ${themeClass}">
<div class="csPlayer-container">
 <span><div></div>
 <i class="ti ti-player-play-filled csPlayer-loading" role="button" tabindex="0" aria-label="Play video" aria-disabled="true"></i>
 <div></div></span>
 <div id=${playerTagId}></div>
</div>
<div class="csPlayer-controls-box">
  <main>
  <i class="ti ti-rewind-backward-10"></i>
  <i class="ti csPlayer-play-pause-btn ti-player-play-filled"></i>
  <i class="ti ti-rewind-forward-10"></i>
  </main>
 <div class="csPlayer-controls">
  <p>00:00</p>
  <div><span></span>
  <input type="range" min="0" max="100" value="0" step="1"></div>
  <p>00:00</p>
  <i class="ti ti-settings settingsBtn"></i>
  <i class="ti ti-maximize fsBtn"></i>
 </div>
 <div class="csPlayer-settings-box">
  <p>Speed<b>1x</b><i class="ti ti-caret-right-filled"></i></p>
  <span>     
  <label><input type="radio" name=${videoTag}1>0.75x</label>
  <label><input type="radio" name=${videoTag}1 checked>1x</label>
  <label><input type="radio" name=${videoTag}1>1.25x</label>
  <label><input type="radio" name=${videoTag}1>1.5x</label>
  <label><input type="radio" name=${videoTag}1>1.75x</label>
  <label><input type="radio" name=${videoTag}1>2x</label>
  </span>

 </div>
</div>
</div>`;    
    resolve();
    });//promise
    },
pauseVideoWithPromise:(x)=>{
    return new Promise((resolve, reject) => {
    try{
    x.pauseVideo()
    resolve('Video paused');
    }catch(error){
    reject('Error pausing video: ' + error);
    }});
    },
YtSetup:(videoTag,playerTagId,defaultId)=>{
var parent = document.querySelector("#"+playerTagId).closest(".csPlayer");
const entry = csPlayer.csPlayers[videoTag];
var controlsTimeout = null;
let observer;
entry.cleanup = () => { clearTimeout(controlsTimeout); observer?.disconnect(); };
return new Promise((resolve, reject) => {
  entry.rejectReady = reject;
  entry.readyTimeout = setTimeout(() => reject(new Error("YouTube player did not become ready within 15 seconds.")), 15000);
  csPlayer.csPlayers[videoTag]["videoTag"] = new YT.Player(playerTagId,{
    videoId: csPlayer.csPlayers[videoTag]["params"]["defaultId"],
    playerVars:{
     controls: 0,
     mute: 0,
     autoplay: 0,
     origin: window.location.origin,
     disablekb: 1,
     color: "white",
     fs: 0,   
     playsinline: 1,
     rel: 0,
     loop: 0,
     cc_load_policy: 3,
     showinfo: 0,
     iv_load_policy: 3,     
    },
    events:{
     'onReady':()=>{
if(entry.cancelled) return;
clearTimeout(entry.readyTimeout);
if($("#"+videoTag) != null && videoTag){
      // onReady is the API readiness signal; the iframe load may have already fired.
      const startButton = parent.querySelector(".csPlayer-container span i");
      startButton.classList.remove("csPlayer-loading");
      startButton.setAttribute("aria-disabled","false");
      startButton.addEventListener("click",()=>csPlayer.play(videoTag));
      startButton.addEventListener("keydown",(event)=>{
      if(event.key === "Enter" || event.key === " "){
      event.preventDefault();
      csPlayer.play(videoTag);
      }});
      parent.querySelector(".csPlayer-controls-box main i:nth-of-type(1)").addEventListener("click", backward);
      parent.querySelector(".csPlayer-controls-box main i:nth-of-type(2)").addEventListener("click", togglePlayPause);
      parent.querySelector(".csPlayer-controls-box main i:nth-of-type(3)").addEventListener("click", forward);           
csPlayer.csPlayers[videoTag]["TextTimeInterval"] = setInterval(updateTextTime,1000);      
      csPlayer.csPlayers[videoTag]["TimeSliderInterval"] = setInterval(updateTimeSlider,1000);         parent.querySelector(".csPlayer-controls-box .csPlayer-controls input").addEventListener("input",updateSlider);
      parent.querySelector(".csPlayer-controls-box .csPlayer-controls .fsBtn").addEventListener("click",toggleFullscreen);
      document.fullscreenEnabled ? parent.querySelector(".csPlayer-controls-box .csPlayer-controls .fsBtn").style.display ="block" : parent.querySelector(".csPlayer-controls-box .csPlayer-controls .fsBtn").style.display ="none";
      parent.querySelector(".csPlayer-controls-box .csPlayer-controls .settingsBtn").addEventListener("click",toggleSettings);
      const controls = parent.querySelector(".csPlayer-controls-box");
      controls.addEventListener("focusin",()=>{
        clearTimeout(controlsTimeout);
        controls.classList.add("csPlayer-controls-open");
      });
      const actions = [
        ["main i:nth-of-type(1)", "Back 10 seconds"],
        ["main i:nth-of-type(2)", "Play or pause"],
        ["main i:nth-of-type(3)", "Forward 10 seconds"],
        [".settingsBtn", "Playback settings"],
        [".fsBtn", "Fullscreen"],
      ];
      for(const [selector,label] of actions){
        const button = parent.querySelector(".csPlayer-controls-box " + selector);
        button.setAttribute("role","button");
        button.setAttribute("tabindex","0");
        button.setAttribute("aria-label",label);
        button.addEventListener("keydown",event=>{
          if(event.key === "Enter" || event.key === " "){ event.preventDefault(); button.click(); }
        });
      }
      parent.querySelector(".csPlayer-controls-box .csPlayer-controls input").setAttribute("aria-label","Seek video");
      resolve();
      }else{
      reject(new Error("Player container "+videoTag+" was removed before YouTube was ready."));
      }}, //onReady
     'onStateChange': onPlayerStateChange,
      'onError':(event)=>{
       if(entry.cancelled) return;
       const error = new Error("YouTube player error: "+event.data);
       if(entry.initialized) entry.params.onError?.(error);
       else reject(error);
     },
    }
  });
}); //promise
//backward 
function backward(){
updateTextTime()
updateTimeSlider()
var currentTime = csPlayer.csPlayers[videoTag]["videoTag"].getCurrentTime();
csPlayer.csPlayers[videoTag]["videoTag"].seekTo(Math.max(0, currentTime - 10), true);
clearTimeout(controlsTimeout);
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);
}
//forward
function forward(){
updateTextTime()
updateTimeSlider()
var currentTime = csPlayer.csPlayers[videoTag]["videoTag"].getCurrentTime();
csPlayer.csPlayers[videoTag]["videoTag"].seekTo(currentTime + 10, true);
clearTimeout(controlsTimeout);
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);
}
//togglePlayPause
function togglePlayPause(){
if(csPlayer.csPlayers[videoTag]["isPlaying"]){
csPlayer.csPlayers[videoTag]["videoTag"].pauseVideo();
clearTimeout(controlsTimeout);
}else{
csPlayer.play(videoTag);
clearTimeout(controlsTimeout);
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);
}}
//returns second to time format
function formatTime(seconds) {
const h = Math.floor(seconds / 3600),
      m = Math.floor((seconds % 3600) / 60),
      s = Math.floor(seconds % 60);
return h > 0 ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
//returns time to seconds
function timeToSeconds(t){
var p = t.split(":").map(Number);
return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
}
//update text time
function updateTextTime(){
var currentTime = csPlayer.csPlayers[videoTag]["videoTag"].getCurrentTime();
var duration = csPlayer.csPlayers[videoTag]["videoTag"].getDuration();
parent.querySelector(".csPlayer-controls-box .csPlayer-controls p:nth-of-type(1)").innerHTML = formatTime(String(currentTime));
parent.querySelector(".csPlayer-controls-box .csPlayer-controls p:nth-of-type(2)").innerHTML = formatTime(String(duration));
}
//update slider
function updateTimeSlider(){
var slider = parent.querySelector(".csPlayer-controls-box .csPlayer-controls div input");
var currentTime = csPlayer.csPlayers[videoTag]["videoTag"].getCurrentTime();
var duration = csPlayer.csPlayers[videoTag]["videoTag"].getDuration();
var progress = duration > 0 ? (currentTime/duration)*100 : 0;
var loaded = (csPlayer.csPlayers[videoTag]["videoTag"].getVideoLoadedFraction())*100;
slider.value = progress;
slider.style.background =`linear-gradient(to right, var(--sliderSeekTrackColor) ${progress}%, transparent ${progress}%)`;
parent.querySelector(".csPlayer-controls-box .csPlayer-controls div span").style.width = loaded+"%";
}
function updateSlider(){
clearTimeout(controlsTimeout);
var slider = parent.querySelector(".csPlayer-controls-box .csPlayer-controls div input");
var duration = csPlayer.csPlayers[videoTag]["videoTag"].getDuration();
var progress = slider.value;
slider.style.background =`linear-gradient(to right, var(--sliderSeekTrackColor) ${progress}%, transparent ${progress}%)`;
csPlayer.csPlayers[videoTag]["videoTag"].seekTo((slider.value/100)*duration);
slider.value = slider.value;
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);
}
//fullscreen
function toggleFullscreen(){
const videoContainer = parent;  
if(!document.fullscreenElement && document.fullscreenEnabled){
 if(videoContainer.requestFullscreen){
 videoContainer.requestFullscreen();
 }else if(videoContainer.mozRequestFullScreen){
 videoContainer.mozRequestFullScreen();
 }else if(videoContainer.webkitRequestFullscreen){
 videoContainer.webkitRequestFullscreen();
 }else if(videoContainer.msRequestFullscreen){
 videoContainer.msRequestFullscreen();
}}
else if(document.fullscreenElement && document.fullscreenEnabled){
 if(document.exitFullscreen){
 document.exitFullscreen();
 }else if(document.mozCancelFullScreen){
 document.mozCancelFullScreen();
 }else if(document.webkitExitFullscreen){
 document.webkitExitFullscreen();
 }else if(document.msExitFullscreen){
 document.msExitFullscreen();
}}else{
console.warn("Fullscreen api not supported in your browser.");
}}
//settings
function resetSettings(){
var settings = parent.querySelector(".csPlayer-controls-box .csPlayer-settings-box");
settings.querySelectorAll("p").forEach(pin=>{
pin.nextElementSibling.style.maxHeight ="0px"; 
});
}
function toggleSettings(){
const targetElement = parent.querySelector(".csPlayer-controls-box");
var settings = parent.querySelector(".csPlayer-controls-box .csPlayer-settings-box");
observer?.disconnect();
const obsrvr = observer = new MutationObserver((mutationsList)=>{
 mutationsList.forEach((mutation) => {
 if(mutation.attributeName === 'class'){
 if(!targetElement.className.includes("open")){
 settings.style.display ="none";
 resetSettings();
 }}});
});
obsrvr.observe(targetElement,{
 attributes: true,
 attributeFilter: ['class'],
});
if(settings.style.display =="block"){
settings.style.display ="none";
}else{
settings.style.display ="block";
}
settings.onclick = ()=>{
clearTimeout(controlsTimeout);
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);
};

settings.querySelectorAll("p").forEach(pin=>{
pin.onclick = ()=>{
 settings.querySelectorAll("p").forEach(Allpin=>{
 Allpin.nextElementSibling.style.maxHeight ="0px";
 });
pin.nextElementSibling.style.maxHeight ="400px";
};
});

settings.querySelectorAll("span:nth-of-type(1) input").forEach(spdInput=>{
spdInput.onchange = (e)=>{
var value = e.target.parentElement.innerText.slice(0,-1);
settings.querySelector("p:nth-of-type(1) b").innerText = value+"x";
csPlayer.csPlayers[videoTag]["videoTag"].setPlaybackRate(Number(value));
};
});


}



function onPlayerStateChange(event){
if(entry.cancelled) return;
if(event.data == YT.PlayerState.PLAYING){
csPlayer.csPlayers[videoTag]["isPlaying"] = true;
csPlayer.csPlayers[videoTag]["playerState"] ="playing";
parent.querySelector(".csPlayer-controls-box main .csPlayer-play-pause-btn").className ="ti csPlayer-play-pause-btn ti-player-pause-filled";
parent.querySelector(".csPlayer-container span i").classList.add("csPlayer-loading");
parent.querySelector(".csPlayer-container span").style.display ="none";
csPlayer.csPlayers[videoTag]["videoTag"].unMute();
parent.querySelector(".csPlayer-container").style.pointerEvents ="none";
parent.querySelector(".csPlayer-controls-box").style.display ="flex";
clearTimeout(controlsTimeout);
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);

parent.querySelector(".csPlayer-controls-box").onclick = function(e){
if(!parent.querySelector(".csPlayer-controls-box main").contains(e.target) && !parent.querySelector(".csPlayer-controls-box .csPlayer-controls").contains(e.target) && !parent.querySelector(".csPlayer-controls-box .csPlayer-settings-box").contains(e.target)){
// A surface click pauses immediately instead of only revealing controls.
csPlayer.pause(videoTag);
}}
parent.querySelector(".csPlayer-controls-box").onpointermove = function(event){
if(event.pointerType === "touch" || !entry.isPlaying) return;
parent.querySelector(".csPlayer-controls-box").classList.add("csPlayer-controls-open");
clearTimeout(controlsTimeout);
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);
};
parent.querySelector(".csPlayer-controls-box .csPlayer-controls").onclick = ()=>{
clearTimeout(controlsTimeout);
controlsTimeout = setTimeout(()=>{parent.querySelector(".csPlayer-controls-box").classList.remove("csPlayer-controls-open");},3000);
};

}else if(event.data == YT.PlayerState.PAUSED){
clearTimeout(controlsTimeout);
csPlayer.csPlayers[videoTag]["isPlaying"] = false;
csPlayer.csPlayers[videoTag]["playerState"] ="paused";
parent.querySelector(".csPlayer-controls-box main .csPlayer-play-pause-btn").className ="ti csPlayer-play-pause-btn ti-player-play-filled";
// Return to the single central play affordance when paused.
const controls = parent.querySelector(".csPlayer-controls-box");
controls.classList.remove("csPlayer-controls-open");
controls.style.display = "none";
parent.querySelector(".csPlayer-controls-box .csPlayer-settings-box").style.display = "none";
const overlay = parent.querySelector(".csPlayer-container span");
overlay.style.backgroundImage = "none";
overlay.style.backgroundColor = "transparent";
overlay.style.display = "flex";
parent.querySelector(".csPlayer-container span i").classList.remove("csPlayer-loading");
parent.querySelector(".csPlayer-container").style.pointerEvents = "auto";
}else if(event.data == YT.PlayerState.BUFFERING){
csPlayer.csPlayers[videoTag]["playerState"] ="buffering";
}else if(event.data == YT.PlayerState.CUED){
csPlayer.csPlayers[videoTag]["playerState"] ="cued";
}else if(event.data == YT.PlayerState.ENDED){
if(csPlayer.csPlayers[videoTag]["params"]["loop"] == true || csPlayer.csPlayers[videoTag]["params"]["loop"] =="true"){
csPlayer.csPlayers[videoTag]["videoTag"].seekTo(0);    
}else{
csPlayer.csPlayers[videoTag]["videoTag"].seekTo(0); 
csPlayer.csPlayers[videoTag]["videoTag"].pauseVideo();
csPlayer.csPlayers[videoTag]["playerState"] ="ended";
}}
try{
csPlayer.csPlayers[videoTag]["videoTag"].unloadModule("captions");
csPlayer.csPlayers[videoTag]["videoTag"].unloadModule("cc");
}catch(exception){}
}
    },
init:(videoTag,params)=>{
return Promise.resolve().then(()=>{
    if(videoTag && params && ("defaultId" in params)){
    if($("#"+videoTag)!=null){
    if(!(videoTag in csPlayer.csPlayers)){
    const entry = csPlayer.csPlayers[videoTag] = {}
    csPlayer.csPlayers[videoTag]["videoTag"] = videoTag;
    csPlayer.csPlayers[videoTag]["params"] = params;
    if("defaultId" in params){
    csPlayer.csPlayers[videoTag]["params"]["defaultId"] = params["defaultId"];
    }if("loop" in params){
    csPlayer.csPlayers[videoTag]["params"]["loop"] = params["loop"];
    }if("thumbnail" in params){
    csPlayer.csPlayers[videoTag]["params"]["thumbnail"] = params["thumbnail"];
    }if("theme" in params){
    csPlayer.csPlayers[videoTag]["params"]["theme"] = params["theme"];
    }
    csPlayer.csPlayers[videoTag]["isPlaying"] = false;
    csPlayer.csPlayers[videoTag]["playerState"] ="paused";
    csPlayer.csPlayers[videoTag]["initialized"] = false;
    const playerTagId = "csPlayer-"+videoTag;
    return csPlayer.preSetup(videoTag,playerTagId,params["defaultId"]).then(()=>{
    if(entry.cancelled) throw new Error("Player destroyed before readiness.");
    var parent = document.querySelector("#"+playerTagId).closest(".csPlayer");
    if(("thumbnail" in csPlayer.csPlayers[videoTag]["params"])){
    if(csPlayer.csPlayers[videoTag]["params"]["thumbnail"] == true || csPlayer.csPlayers[videoTag]["params"]["thumbnail"] =="true"){
    parent.querySelector(".csPlayer-container span").style.backgroundImage =`url("https://img.youtube.com/vi/${csPlayer.csPlayers[videoTag]["params"]["defaultId"]}/maxresdefault.jpg")`;
    }else if(csPlayer.csPlayers[videoTag]["params"]["thumbnail"] == false || csPlayer.csPlayers[videoTag]["params"]["thumbnail"] =="false"){
    parent.querySelector(".csPlayer-container span").style.backgroundImage ="none";
    }else{
    parent.querySelector(".csPlayer-container span").style.backgroundImage =`url(${csPlayer.csPlayers[videoTag]["params"]["thumbnail"]})`;
    }}
    return csPlayer.waitForYouTube(entry).then(()=>{
    if(entry.cancelled) throw new Error("Player destroyed before readiness.");
    return csPlayer.YtSetup(videoTag,playerTagId,params["defaultId"]);
    }).then(()=>{
    csPlayer.csPlayers[videoTag]["initialized"] = true;

    }).catch((error)=>{
    if(csPlayer.csPlayers[videoTag] === entry) csPlayer.destroy(videoTag);
    throw error;
    });
    });
    }else{
    throw new Error("Player "+videoTag+" already exists.");
    }}else{
    throw new Error("No tag with id "+videoTag+" available in the document.");
    }}else{
    throw new Error("Init function must have two parameters and second parameter must have defaultId.");
    }
});
    },
    
    
pause:(videoTag)=>{
    if(videoTag){
    if((videoTag in csPlayer.csPlayers) && csPlayer.csPlayers[videoTag]["initialized"] == true){
    csPlayer.csPlayers[videoTag]["videoTag"].pauseVideo();
    }else{
    throw new Error("Player "+videoTag+" is not initialized yet.")
    }}else{
    throw new Error("pause function must have player id as a parameter.")
    }
    },
play:(videoTag)=>{
    if(videoTag){
    if((videoTag in csPlayer.csPlayers) && csPlayer.csPlayers[videoTag]["initialized"] == true){
    csPlayer.csPlayers[videoTag]["videoTag"].unMute();
    csPlayer.csPlayers[videoTag]["videoTag"].playVideo();
    }else{
    throw new Error("Player "+videoTag+" is not initialized yet.")
    }}else{
    throw new Error("play function must have player id as a parameter.")
    }
    },
getDuration:(videoTag)=>{
    if(videoTag){
    if((videoTag in csPlayer.csPlayers) && csPlayer.csPlayers[videoTag]["initialized"] == true){
    return csPlayer.csPlayers[videoTag]["videoTag"].getDuration();
    }else{
    throw new Error("Player "+videoTag+" is not initialized yet.")
    }}else{
    throw new Error("getDuration function must have player id as a parameter.")
    }
    },
getCurrentTime:(videoTag)=>{
    if(videoTag){
    if((videoTag in csPlayer.csPlayers) && csPlayer.csPlayers[videoTag]["initialized"] == true){
    return csPlayer.csPlayers[videoTag]["videoTag"].getCurrentTime();
    }else{
    throw new Error("Player "+videoTag+" is not initialized yet.")
    }}else{
    throw new Error("getCurrentTime function must have player id as a parameter.")
    }
    },
getVideoTitle:(videoTag)=>{
    if(videoTag){
    if((videoTag in csPlayer.csPlayers) && csPlayer.csPlayers[videoTag]["initialized"] == true){
    return csPlayer.csPlayers[videoTag]["videoTag"].getVideoData().title;
    }else{
    throw new Error("Player "+videoTag+" is not initialized yet.")
    }}else{
    throw new Error("getVideoTitle function must have player id as a parameter.")
    }
    },
getPlayerState:(videoTag)=>{
    if(videoTag){
    if((videoTag in csPlayer.csPlayers) && csPlayer.csPlayers[videoTag]["initialized"] == true){
    return csPlayer.csPlayers[videoTag]["playerState"];
    }else{
    throw new Error("Player "+videoTag+" is not initialized yet.")
    }}else{
    throw new Error("getPlayerState function must have player id as a parameter.")
    }
    },
changeVideo:(videoTag,videoId)=>{
    if(videoTag && videoId){
    if((videoTag in csPlayer.csPlayers) && csPlayer.csPlayers[videoTag]["initialized"] == true){
     if(!csPlayer.csPlayers[videoTag]["videoTag"].isMuted()){
     csPlayer.csPlayers[videoTag]["videoTag"].loadVideoById(videoId,0);
     }else{
     throw new Error("Before calling the changeVideo function, the previous video must be played in the player.");
     }
    }else{
    throw new Error("Player "+videoTag+" is not initialized yet.")
    }}else{
    throw new Error("changeVideo function must have two parameters, first parameter as player Id and second as the new YouTube video ID.")
    }
    },
destroy:(videoTag)=>{
    const entry = csPlayer.csPlayers[videoTag];
    if(!entry) return;
    entry.cancelled = true;
    clearTimeout(entry.readyTimeout);
    clearInterval(entry.TimeSliderInterval);
    clearInterval(entry.TextTimeInterval);
    entry.cleanup?.();
    entry.rejectReady?.(new Error("Player destroyed before readiness."));
    entry.videoTag?.destroy?.();
    delete csPlayer.csPlayers[videoTag];
    $("#"+videoTag+" .csPlayer")?.remove();
    },
initialized:(videoTag)=>{
    if(videoTag){
    if((videoTag in csPlayer.csPlayers)){        
    return csPlayer.csPlayers[videoTag]["initialized"];
    }else{
    throw new Error("Player "+videoTag+" doesn't exist. ")
    }}else{
    throw new Error("pause function must have player id as a parameter.")
    }
    },
}





// The reusable player has one renderer and one visibility timer. The legacy
// ID-based engine remains available separately for existing integrations.
const controlDefaults = {
  visibility: 'auto', progress: true, time: true, playPause: true,
  skip: false, speed: true, fullscreen: true, showWhenPaused: true,
  hideDelay: 2500,
};
function normalizeControls(value = 'minimal') {
  if (value === 'minimal') return { ...controlDefaults, visibility: 'hidden' };
  if (value === 'standard') return { ...controlDefaults, visibility: 'always' };
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('controls must be minimal, standard or a controls object.');
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(controlDefaults, key)) throw new Error(`Unknown control option: ${key}`);
  }
  const result = { ...controlDefaults, ...value };
  if (!['auto', 'always', 'hidden'].includes(result.visibility)) throw new Error('Invalid controls visibility.');
  for (const key of ['progress', 'time', 'playPause', 'skip', 'speed', 'fullscreen', 'showWhenPaused']) {
    if (typeof result[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
  }
  if (!Number.isFinite(result.hideDelay) || result.hideDelay < 500 || result.hideDelay > 30000) throw new Error('hideDelay must be between 500 and 30000 milliseconds.');
  return result;
}
function playerTime(value) {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0'));
  if (seconds >= 3600) parts.unshift(String(Math.floor(seconds / 3600)));
  return parts.join(':');
}
function mountPlayer(node, options) {
  let controls = normalizeControls(options.controls);
  let state = 'loading';
  let yt, destroyed = false, ready = false, started = false, wantsPlay = false;
  let awake = true, touch = false, interacting = false, seeking = false;
  let hideTimer, updateTimer, readyTimer, rejectReady;
  let errorMessage = '';
  node.innerHTML = `
    <div class="csPlayer csPlayer-modern theme-${options.theme}" data-state="loading" role="group" aria-label="Video player">
      <div class="csp-viewport"><div id="${node.id}-iframe"></div></div>
      <button type="button" class="csp-surface" aria-label="Play video" disabled>
        <span class="csp-center" aria-hidden="true"><i class="ti ti-player-play-filled"></i></span>
      </button>
      <div class="csp-toolbar" role="group" aria-label="Video controls" hidden>
        <button type="button" data-control="playPause" aria-label="Play"><i class="ti ti-player-play-filled" aria-hidden="true"></i></button>
        <button type="button" data-control="skip" data-action="back" aria-label="Back 10 seconds"><i class="ti ti-rewind-backward-10" aria-hidden="true"></i></button>
        <button type="button" data-control="skip" data-action="forward" aria-label="Forward 10 seconds"><i class="ti ti-rewind-forward-10" aria-hidden="true"></i></button>
        <span data-control="time" class="csp-time csp-current">00:00</span>
        <input data-control="progress" class="csp-seek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Seek video">
        <span data-control="time" class="csp-time csp-duration">00:00</span>
        <select data-control="speed" class="csp-speed" aria-label="Playback speed">
          <option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option>
        </select>
        <button type="button" data-control="fullscreen" aria-label="Enter fullscreen"><i class="ti ti-maximize" aria-hidden="true"></i></button>
      </div>
      <p class="csp-error" role="alert" hidden></p>
    </div>`;
  const root = node.firstElementChild;
  const surface = root.querySelector('.csp-surface');
  const center = root.querySelector('.csp-center');
  const toolbar = root.querySelector('.csp-toolbar');
  const seek = root.querySelector('.csp-seek');
  const speed = root.querySelector('.csp-speed');
  const alert = root.querySelector('.csp-error');
  const cleanups = [];
  const listen = (target, name, handler) => {
    target.addEventListener(name, handler);
    cleanups.push(() => target.removeEventListener(name, handler));
  };
  if (options.thumbnail) {
    const url = options.thumbnail === true ? `https://img.youtube.com/vi/${options.videoId}/maxresdefault.jpg` : options.thumbnail;
    surface.style.backgroundImage = `url(${JSON.stringify(url)})`;
  }
  function assertReady() {
    if (destroyed) throw new Error('Player has been destroyed.');
    if (!ready) throw new Error('Await player.ready before using playback methods.');
  }
  function render() {
    if (destroyed) return;
    root.dataset.state = state;
    root.setAttribute('aria-busy', String(state === 'loading' || state === 'buffering'));
    surface.disabled = !ready;
    surface.setAttribute('aria-label', wantsPlay ? 'Pause video' : (state === 'ended' ? 'Replay video' : 'Play video'));
    center.hidden = state === 'playing';
    center.classList.toggle('csp-busy', state === 'loading' || state === 'buffering');
    if (started) surface.style.backgroundImage = 'none';
    alert.hidden = !errorMessage;
    alert.textContent = errorMessage;
    const paused = ['paused', 'cued', 'ended', 'error'].includes(state);
    let count = 0;
    for (const element of toolbar.querySelectorAll('[data-control]')) {
      const key = element.dataset.control;
      const enabled = controls[key] && (key !== 'fullscreen' || !!document.fullscreenEnabled);
      element.hidden = !enabled;
      if (enabled) count++;
      if (!enabled && element === document.activeElement) surface.focus();
    }
    const visible = ready && count > 0 && controls.visibility !== 'hidden' &&
      (paused ? controls.showWhenPaused : controls.visibility === 'always' || touch || awake || interacting || seeking);
    // Move keyboard focus to the surface before hiding a focused control.
    if (!visible && toolbar.contains(document.activeElement)) surface.focus();
    toolbar.hidden = !visible;
    reserveControlsSpace();
    const playButton = toolbar.querySelector('[data-control="playPause"]');
    playButton.setAttribute('aria-label', wantsPlay ? 'Pause' : 'Play');
    playButton.firstElementChild.className = `ti ${wantsPlay ? 'ti-player-pause-filled' : 'ti-player-play-filled'}`;
    seek.disabled = !(yt?.getDuration?.() > 0);
  }
  function reserveControlsSpace() {
    root.style.setProperty('--csp-toolbar-space', `${toolbar.hidden ? 0 : toolbar.offsetHeight + 8}px`);
  }
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(reserveControlsSpace);
    observer.observe(toolbar);
    cleanups.push(() => observer.disconnect());
  }
  function scheduleHide() {
    clearTimeout(hideTimer);
    if (controls.visibility !== 'auto' || touch || interacting || seeking || state !== 'playing') return;
    hideTimer = setTimeout(() => { awake = false; render(); }, controls.hideDelay);
  }
  function reveal() { awake = true; render(); scheduleHide(); }
  function notifyState() { options.onStateChange?.(state); }
  function setState(next) {
    const changed = next !== state;
    state = next;
    if (next === 'playing') wantsPlay = true;
    else if (['paused', 'ended', 'error'].includes(next)) wantsPlay = false;
    if (next === 'playing') {
      started = true; errorMessage = '';
      try { yt.unloadModule?.('captions'); } catch {}
    }
    if (next !== 'playing') clearTimeout(hideTimer);
    render(); updateProgress(); scheduleHide(); if (changed) notifyState();
  }
  function fail(error) {
    if (destroyed) return;
    errorMessage = error.message;
    if (!ready) { rejectReady(error); return; }
    setState('error'); options.onError?.(error);
  }
  function updateProgress() {
    if (destroyed || !ready) return;
    const duration = Math.max(0, yt.getDuration() || 0);
    const time = Math.max(0, yt.getCurrentTime() || 0);
    root.querySelector('.csp-current').textContent = playerTime(seeking ? Number(seek.value) * duration / 100 : time);
    root.querySelector('.csp-duration').textContent = playerTime(duration);
    if (!seeking) seek.value = duration > 0 ? Math.min(100, time / duration * 100) : 0;
    seek.setAttribute('aria-valuetext', `${playerTime(seeking ? Number(seek.value) * duration / 100 : time)} of ${playerTime(duration)}`);
    seek.disabled = !duration;
  }
  function play() { assertReady(); wantsPlay = true; errorMessage = ''; setState('buffering'); yt.unMute(); yt.playVideo(); }
  function pause() { assertReady(); wantsPlay = false; yt.pauseVideo(); render(); }
  function toggle() { wantsPlay ? pause() : play(); }
  function seekTo(seconds) {
    assertReady();
    const duration = yt.getDuration();
    if (!Number.isFinite(seconds) || !duration) return;
    const resume = wantsPlay;
    yt.seekTo(Math.max(0, Math.min(duration, seconds)), true);
    // YouTube can start playback when seeking a cued video. Preserve intent.
    if (!resume) yt.pauseVideo();
    updateProgress();
  }
  listen(surface, 'click', toggle);
  listen(toolbar.querySelector('[data-control="playPause"]'), 'click', toggle);
  listen(toolbar.querySelector('[data-action="back"]'), 'click', () => seekTo(yt.getCurrentTime() - 10));
  listen(toolbar.querySelector('[data-action="forward"]'), 'click', () => seekTo(yt.getCurrentTime() + 10));
  listen(root, 'pointermove', event => {
    if (event.pointerType !== 'touch') reveal();
  });
  listen(root, 'pointerdown', event => {
    interacting = event.target.matches('select, input');
    if (event.pointerType === 'touch') touch = true;
    reveal();
  });
  listen(root, 'focusin', event => {
    if (event.target.matches(':focus-visible')) { interacting = true; reveal(); }
  });
  listen(root, 'focusout', () => {
    queueMicrotask(() => {
      if (destroyed) return;
      interacting = root.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
      scheduleHide();
    });
  });
  listen(seek, 'input', () => { seeking = true; clearTimeout(hideTimer); updateProgress(); });
  listen(seek, 'change', () => {
    seekTo(Number(seek.value) * yt.getDuration() / 100);
    seeking = false; updateProgress(); scheduleHide();
  });
  listen(seek, 'blur', () => { seeking = false; updateProgress(); scheduleHide(); });
  listen(speed, 'change', () => { yt.setPlaybackRate(Number(speed.value)); reveal(); });
  listen(toolbar, 'keydown', event => {
    if (event.key === 'Escape') { surface.focus(); interacting = false; awake = false; render(); }
  });
  const fullscreenButton = toolbar.querySelector('[data-control="fullscreen"]');
  listen(fullscreenButton, 'click', async () => {
    try {
      if (document.fullscreenElement === root) await document.exitFullscreen();
      else await root.requestFullscreen();
    } catch (error) { options.onError?.(error); }
  });
  listen(document, 'fullscreenchange', () => {
    fullscreenButton.setAttribute('aria-label', document.fullscreenElement === root ? 'Exit fullscreen' : 'Enter fullscreen');
    reveal();
  });
  const api = {
    ready: null, play, pause, seekTo,
    setControls(value) {
      if (destroyed) throw new Error('Player has been destroyed.');
      controls = normalizeControls(value);
      if (!controls.progress || controls.visibility === 'hidden') seeking = false;
      reveal();
    },
    changeVideo(id) {
      assertReady();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Invalid YouTube video ID.');
      wantsPlay = true; started = true; errorMessage = '';
      setState('buffering'); yt.loadVideoById(id, 0);
    },
    getDuration() { assertReady(); return yt.getDuration(); },
    getCurrentTime() { assertReady(); return yt.getCurrentTime(); },
    getVideoTitle() { assertReady(); return yt.getVideoData().title; },
    getPlayerState() { assertReady(); return state; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(readyTimer); clearTimeout(hideTimer); clearInterval(updateTimer);
      cleanups.forEach(cleanup => cleanup());
      rejectReady?.(new Error('Player destroyed before readiness.'));
      yt?.destroy(); root.remove();
    },
  };
  api.ready = new Promise((resolve, reject) => {
    rejectReady = reject;
    readyTimer = setTimeout(() => reject(new Error('YouTube player did not become ready within 15 seconds.')), 15000);
    yt = new window.YT.Player(`${node.id}-iframe`, {
      videoId: options.videoId,
      playerVars: { controls: 0, autoplay: 0, playsinline: 1, disablekb: 1, fs: 0, rel: 0, origin: window.location.origin },
      events: {
        onReady() {
          if (destroyed) return;
          clearTimeout(readyTimer);
          ready = true;
          const iframe = root.querySelector('iframe');
          iframe?.setAttribute('tabindex', '-1');
          iframe?.setAttribute('aria-hidden', 'true');
          root.setAttribute('aria-label', yt.getVideoData?.().title || 'Video player');
          setState('cued');
          updateTimer = setInterval(updateProgress, 250);
          resolve(api);
        },
        onStateChange(event) {
          if (destroyed || !ready) return;
          const next = { '-1': 'cued', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' }[event.data];
          if (!next) return;
          if (next === 'ended' && options.loop) { yt.seekTo(0, true); play(); return; }
          setState(next === 'cued' && wantsPlay ? 'buffering' : next);
        },
        onPlaybackRateChange(event) { if (!destroyed) speed.value = String(event.data); },
        onAutoplayBlocked() { if (!destroyed && ready) setState('paused'); },
        onError(event) { fail(new Error(`YouTube player error: ${event.data}`)); },
      },
    });
  });
  api.ready.catch(() => {});
  render();
  return api;
}

// No DOM work at import time: safe to import from server-rendered applications.
let youtubePromise;
function loadYouTubeAPI() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('csPlayer requires a browser to mount.'));
  }
  if (typeof window.YT?.Player === 'function') return Promise.resolve();
  if (youtubePromise) return youtubePromise;
  youtubePromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const owned = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
    }
    let poll;
    const cleanup = () => { clearInterval(poll); clearTimeout(timeout); script.removeEventListener('error', failed); };
    const failed = () => {
      cleanup();
      if (owned) script.remove();
      reject(new Error('Could not load the YouTube iframe API. Check your connection and content security policy.'));
    };
    const timeout = setTimeout(failed, 15000);
    script.addEventListener('error', failed, { once: true });
    poll = setInterval(() => {
      if (typeof window.YT?.Player === 'function') { cleanup(); resolve(); }
    }, 50);
    if (owned) document.head.append(script);
  }).catch(error => { youtubePromise = undefined; throw error; });
  return youtubePromise;
}

const mounts = new WeakMap();
let nextId = 0;
/** Mount into an empty element. Destroy is safe even while ready is pending. */
function createPlayer(target, options = {}) {
  if (typeof document === 'undefined') throw new Error('csPlayer requires a browser to mount.');
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host || host.nodeType !== 1 || !host.isConnected) throw new Error('Player target must be a connected HTML element.');
  if (mounts.has(host) || host.childNodes.length) throw new Error('Player target must be empty and not already mounted.');
  const { videoId, thumbnail = true, theme = 'default', loop = false, onError, onStateChange } = options;
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new Error('videoId must be an 11-character YouTube video ID.');
  if (!['default', 'youtube', 'plyr'].includes(theme)) throw new Error('Unknown csPlayer theme.');
  if (typeof thumbnail !== 'boolean' && typeof thumbnail !== 'string') throw new Error('thumbnail must be a boolean or URL.');
  if (onError !== undefined && typeof onError !== 'function') throw new Error('onError must be a function.');
  if (typeof loop !== 'boolean') throw new Error('loop must be a boolean.');
  normalizeControls(options.controls);
  if (onStateChange !== undefined && typeof onStateChange !== 'function') throw new Error('onStateChange must be a function.');
  const node = document.createElement('div');
  do { node.id = `csplayer-mount-${++nextId}`; } while (document.getElementById(node.id));
  host.append(node);
  let destroyed = false;
  let engine;
  let controlOptions = options.controls;
  let rejectCancelled;
  const cancelled = new Promise((_, reject) => { rejectCancelled = reject; });
  let readyDone = false;
  const assertReady = () => {
    if (destroyed) throw new Error('Player has been destroyed.');
    if (!engine || !readyDone) throw new Error('Await player.ready before using playback methods.');
  };
  const player = {
    ready: null,
    play() { assertReady(); engine.play(); },
    pause() { assertReady(); engine.pause(); },
    changeVideo(id) {
      assertReady();
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Invalid YouTube video ID.');
      engine.changeVideo(id);
    },
    getDuration() { assertReady(); return engine.getDuration(); },
    getCurrentTime() { assertReady(); return engine.getCurrentTime(); },
    getVideoTitle() { assertReady(); return engine.getVideoTitle(); },
    getPlayerState() { assertReady(); return engine.getPlayerState(); },
    seekTo(seconds) { assertReady(); engine.seekTo(seconds); },
    setControls(value) {
      if (destroyed) throw new Error('Player has been destroyed.');
      normalizeControls(value);
      controlOptions = value;
      engine?.setControls(value);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      rejectCancelled(new Error('Player destroyed before readiness.'));
      engine?.destroy();
      node.remove();
      mounts.delete(host);
    },
  };
  mounts.set(host, player);
  player.ready = Promise.race([
    loadYouTubeAPI().then(() => {
      if (destroyed) throw new Error('Player destroyed before readiness.');
      engine = mountPlayer(node, { videoId, thumbnail, theme, loop, onError, onStateChange, controls: controlOptions });
      return engine.ready;
    }),
    cancelled,
  ]).then(() => { readyDone = true; return player; }).catch(error => { player.destroy(); throw error; });
  // A framework can unmount before it attaches a readiness handler.
  player.ready.catch(() => {});
  return player;
}

module.exports = { createPlayer, loadYouTubeAPI, csPlayer };
