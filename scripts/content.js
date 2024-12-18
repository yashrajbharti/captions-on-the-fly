const floatingCaptionsDiv = document.createElement("div");
floatingCaptionsDiv.classList.add("floating-captions");
const floatingWrapper = document.createElement("div");
floatingWrapper.classList.add("floating-wrapper");

floatingWrapper.appendChild(floatingCaptionsDiv);
document.body.appendChild(floatingWrapper);

const floatingCaptions = new FloatingCaptions(floatingCaptionsDiv);

const video = document.querySelector("video");

floatingCaptions.setAttribute("id", "captions");
floatingCaptions.setAttribute("time", "");
floatingCaptions.setAttribute("content", "[]");
floatingCaptions.setAttribute("type", "append");

// State Management
let isBusy = false;
let videoSrc =
  video?.getAttribute("src") ||
  video?.querySelector("source")?.getAttribute("src");

if (localStorage.getItem(window.location.href + videoSrc))
  floatingCaptions.setAttribute(
    "content",
    localStorage.getItem(window.location.href + videoSrc)
  );

// UI Elements

// Handle messages from the background script (worker logic)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { status, data } = message;

  if (localStorage.getItem(window.location.href + videoSrc)) return;

  switch (status) {
    case "update":
      console.log(data);
      updateTranscript(data[0], data[1].chunks);
      break;

    case "complete":
      finalizeTranscript(data, data.chunks);
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
      console.info(data);
      break;

    case "error":
      console.log(data.message);
      setBusy(false);
      break;
    default:
      console.error("Unknown message:", data);
  }
  return true;
});

// Update the output transcript
const updateTranscript = (text, chunksArray) => {
  floatingCaptions.setAttribute("content", JSON.stringify(chunksArray));
};

// Finalize the transcription process
const finalizeTranscript = (text, chunksArray) => {
  console.log(chunksArray);
  floatingCaptions.setAttribute("content", JSON.stringify(chunksArray));
  localStorage.setItem(
    window.location.href + videoSrc,
    JSON.stringify(chunksArray)
  );
  console.log("Transcription complete!");
};

const getVideoAsFile = async () => {
  try {
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
  if (localStorage.getItem(window.location.href + videoSrc)) return;

  const audioFile = await getVideoAsFile(videoSrc);
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
    async (audioData) => {
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
        audio = audioData.getChannelData(0);
      }
      audioContext.close();

      const model = "Xenova/whisper-tiny";
      const multilingual = false;
      const quantized = true;
      const subtask = "transcribe";
      const language = "english";

      // Send the audio and transcription details to background script (worker logic)
      sendChunksToWorker(
        audio,
        model,
        multilingual,
        quantized,
        subtask,
        language
      );
    },
    (error) => {
      console.log("Error decoding audio: " + error.message);
      setBusy(false);
    }
  );
};

const sendChunksToWorker = (
  audio,
  model,
  multilingual,
  quantized,
  subtask,
  language
) => {
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalLength = audio.length;

  for (let i = 0; i < totalLength; i += chunkSize) {
    const chunk = audio.slice(i, i + chunkSize);
    chrome.runtime.sendMessage({
      audioChunks: [...chunk],
      totalLength,
      model,
      multilingual,
      quantized,
      subtask,
      language,
    });
  }
};
