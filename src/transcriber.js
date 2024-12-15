// Main script: Decode the audio in the main thread
const worker = new Worker("./worker.js", { type: "module" });
const floatingCaptions = document.querySelector("floating-captions");

// UI Elements
const video = document.querySelector("video");

// State Management
let isBusy = false;
let videoSrc;

// Handle messages from the worker
worker.onmessage = (event) => {
  const { status, data } = event.data;
  if (localStorage.getItem(window.location.href + videoSrc)) {
    floatingCaptions.setAttribute(
      "content",
      localStorage.getItem(window.location.href + videoSrc)
    );
    return;
  }
  switch (status) {
    case "update":
      updateTranscript(data[0], data[1].chunks);
      break;

    case "complete":
      // console.log(data);
      finalizeTranscript(data.text, data.chunks);
      setBusy(false);
      break;

    case "error":
      console.log(data.message);
      setBusy(false);
      break;
    case "initiate":
      break;
    case "progress":
      break;
    case "done":
      break;
    case "ready":
      break;
    case "download":
      break;
    default:
      console.error("Unknown message status:", status);
  }
};

// Update the output transcript
const updateTranscript = (text, chunksArray) => {
  floatingCaptions.setAttribute("content", JSON.stringify(chunksArray));
  // console.log(chunksArray);
};

// Finalize the transcription process
const finalizeTranscript = (text, chunksArray) => {
  floatingCaptions.setAttribute("content", JSON.stringify(chunksArray));
  console.log(chunksArray);
  // console.log(text);
  localStorage.setItem(
    window.location.href + videoSrc,
    JSON.stringify(chunksArray)
  );
  console.log("Transcription complete!");
};

const getVideoAsFile = async (videoEl) => {
  try {
    videoSrc =
      videoEl?.getAttribute("src") ||
      videoEl?.querySelector("source")?.getAttribute("src");
    if (!videoSrc) {
      throw new Error("Video source not found!");
    }
    const response = await fetch(videoSrc);
    const blob = await response.blob();
    const file = new File([blob], "video.mp4", { type: blob.type });

    return file;
  } catch (error) {
    console.error("Error converting video source to file:", error);
    return null;
  }
};

// Manage the "busy" state
const setBusy = (state) => {
  isBusy = state;
};

video.addEventListener("timeupdate", () =>
  floatingCaptions.setAttribute("time", video.currentTime)
);

// Handle the transcribe button click
video.addEventListener("play", async () => {
  if (isBusy) return;
  if (localStorage.getItem(window.location.href + videoSrc)) {
    floatingCaptions.setAttribute(
      "content",
      localStorage.getItem(window.location.href + videoSrc)
    );
    return;
  }
  const audioFile = await getVideoAsFile(video);
  // console.log(audioFile);
  if (!audioFile) {
    console.log("Please select an audio file first!");
    return;
  }

  setBusy(true);

  const fileReader = new FileReader();
  fileReader.onload = () => {
    const arrayBuffer = fileReader.result;
    decodeAudio(arrayBuffer);
  };
  fileReader.readAsArrayBuffer(audioFile);
});

const decodeAudio = (arrayBuffer) => {
  const audioContext = new AudioContext({ sampleRate: 16000 });

  audioContext.decodeAudioData(
    arrayBuffer,
    (audioData) => {
      let audio;
      if (audioData.numberOfChannels === 2) {
        const SCALING_FACTOR = Math.sqrt(2);

        let left = audioData.getChannelData(0);
        let right = audioData.getChannelData(1);

        audio = new Float32Array(left.length);
        for (let i = 0; i < audioData.length; ++i) {
          audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
        }
      } else {
        // If the audio is not stereo, we can just use the first channel:
        audio = audioData.getChannelData(0);
      }
      const model = "Xenova/whisper-tiny";
      const multilingual = false;
      const quantized = false;
      const subtask = "transcribe";
      const language = "english";

      // Send the message to the worker with hardcoded values
      worker.postMessage({
        audio,
        model,
        multilingual,
        quantized,
        subtask: multilingual ? subtask : null,
        language: multilingual && language !== "auto" ? language : null,
      });
    },
    (error) => {
      console.log("Error decoding audio: " + error.message);
      setBusy(false);
    }
  );
};
