const videoWidth = 600;
const videoHeight = 500;


function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}


async function setupCamera() {
  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const mobile = isMobile();
    const stream = await navigator.mediaDevices.getUserMedia({
      'audio': false,
      'video': {
        facingMode: 'user',
        width: mobile ? undefined : videoWidth,
        height: mobile ? undefined: videoHeight}
    });
    video.srcObject = stream;

    return new Promise(resolve => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  } else {
    const errorMessage = "This browser does not support video capture, or this device does not have a camera";
    alert(errorMessage);
    return Promise.reject(errorMessage);
  }
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const guiState = {
  algorithm: 'multi-pose',
  multiPoseDetection: {
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0,
  }
};

function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  const flipHorizontal = true; 

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {    

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    
    let all_poses = await net.estimatePoses(video, {
      flipHorizontal: true,
      decodingMethod: 'multi-person',
      maxDetections: guiState.multiPoseDetection.maxPoseDetections,
      scoreThreshold: guiState.multiPoseDetection.minPartConfidence,
      nmsRadius: guiState.multiPoseDetection.nmsRadius
    });
    poses = poses.concat(all_poses);
    console.log(poses);
    
    minPoseConfidence = Number(guiState.multiPoseDetection.minPoseConfidence);
    minPartConfidence = Number(guiState.multiPoseDetection.minPartConfidence);
    
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();
    ctx.font = "20px Arial";
   
    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
          drawKeypoints(keypoints, minPartConfidence, ctx);        
          drawSkeleton(keypoints, minPartConfidence, ctx);     
          var dif =  keypoints[2].position.x - keypoints[1].position.x;
          var posx = keypoints[1].position.x + (dif/2);
          var posy = keypoints[1].position.y - 100;
          ctx.fillText(angle(keypoints[5].position.x,keypoints[6].position.x,keypoints[5].position.y,keypoints[6].position.y)*-1, posx, posy);
      }


    });
    
    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

function angle(x1,x2,y1,y2){
return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

async function bindPage() {
  const net = await posenet.load({    
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: 200,
    multiplier: 0.75,
    quantBytes: 2
  });

  // const net = await posenet.load({    
  //   architecture: 'ResNet50',
  //   outputStride: 32,
  //   inputResolution: 200,
  //   multiplier: 1.0,
  //   quantBytes: 2
  // });

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';

  let video;

  try {
    video = await loadVideo();
  } catch(e) {
    console.error(e);
    return;
  }
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
bindPage(); 
