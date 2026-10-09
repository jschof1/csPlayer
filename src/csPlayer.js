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




