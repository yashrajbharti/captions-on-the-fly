import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.0.0";
// Disable local models
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

// Define model factories
// Ensures only one model is created of each type
class PipelineFactory {
  static task = null;
  static model = null;
  static quantized = null;
  static instance = null;

  constructor(tokenizer, model, quantized) {
    this.tokenizer = tokenizer;
    this.model = model;
    this.quantized = quantized;
  }

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        quantized: this.quantized,
        progress_callback,

        // For medium models, we need to load the `no_attentions` revision to avoid running out of memory
        revision: this.model.includes("/whisper-medium")
          ? "no_attentions"
          : "main",
      });
    }

    return this.instance;
  }
}

const sendMessageToContentScript = (message) => {
  // Query the active tab in the current window
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      console.warn("No active tab found.");
      return;
    }

    const activeTabId = tabs[0].id; // Get the active tab's ID

    // Send a message to the content script in the active tab
    chrome.tabs.sendMessage(activeTabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Error sending message:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("Response from content script:", response);
      }
    });
  });
};

let audioBuffer = new Float32Array(0);
let currentLength = 0;

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  const {
    audioChunks,
    totalLength,
    model,
    multilingual,
    quantized,
    subtask,
    language,
  } = message;

  const chunkArray = Float32Array.from(audioChunks);

  const newBuffer = new Float32Array(currentLength + chunkArray.length);
  newBuffer.set(audioBuffer, 0); // Copy existing data
  newBuffer.set(chunkArray, currentLength); // Append new chunk
  audioBuffer = newBuffer;

  currentLength += audioChunks.length;

  // Process message data
  if (currentLength >= totalLength) {
    let transcript = await transcribe(
      audioBuffer,
      model,
      multilingual,
      quantized,
      subtask,
      language
    );

    if (transcript === null) return;

    // Send the result back to the main thread via Chrome runtime
    sendMessageToContentScript({
      status: "complete",
      task: "automatic-speech-recognition",
      data: transcript,
    });
  }
  return true;
});

class AutomaticSpeechRecognitionPipelineFactory extends PipelineFactory {
  static task = "automatic-speech-recognition";
  static model = null;
  static quantized = null;
}

const transcribe = async (
  audio,
  model,
  multilingual,
  quantized,
  subtask,
  language
) => {
  const isDistilWhisper = model.startsWith("distil-whisper/");

  let modelName = model;
  if (!isDistilWhisper && !multilingual) {
    modelName += ".en";
  }

  const p = AutomaticSpeechRecognitionPipelineFactory;

  if (p.model !== modelName || p.quantized !== quantized) {
    // Invalidate model if different
    p.model = modelName;
    p.quantized = quantized;

    if (p.instance !== null) {
      (await p.getInstance()).dispose();
      p.instance = null;
    }
  }

  // Load transcriber model
  let transcriber = await p.getInstance((data) => {
    sendMessageToContentScript({
      status: "download",
      task: "automatic-speech-recognition",
      data: data,
    });
  });

  const time_precision =
    transcriber.processor.feature_extractor.config.chunk_length /
    transcriber.model.config.max_source_positions;

  // Storage for chunks to be processed. Initialize with an empty chunk.
  let chunks_to_process = [
    {
      tokens: [],
      finalised: false,
    },
  ];

  function chunk_callback(chunk) {
    let last = chunks_to_process[chunks_to_process.length - 1];
    // Overwrite last chunk with new info
    Object.assign(last, chunk);
    last.finalised = true;

    // Create an empty chunk after, if it is not the last chunk
    if (!chunk.is_last) {
      chunks_to_process.push({
        tokens: [],
        finalised: false,
      });
    }
  }

  const sendMessageToContentScriptAsync = (message) => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.warn("No tabs found in the current window.");
        return reject("No tabs found in the current window.");
      }

      // Find the active tab or fall back to the first tab
      const targetTab = tabs.find((tab) => tab.active) || tabs[0];
      const targetTabId = targetTab.id;

      chrome.tabs.sendMessage(targetTabId, message, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Error sending message:",
            chrome.runtime.lastError.message
          );
          return reject(chrome.runtime.lastError.message);
        }

        console.log("Response from content script:", response);
        resolve(response);
      });
    });
  };

  function callback_function(item) {
    let last = chunks_to_process[chunks_to_process.length - 1];

    // Update tokens of last chunk
    last.tokens = [...item[0].output_token_ids];

    // Merge text chunks
    let data = transcriber.tokenizer._decode_asr(chunks_to_process, {
      time_precision: time_precision,
      return_timestamps: true,
      force_full_sequences: false,
    });
    console.info(data);

    sendMessageToContentScriptAsync({
      status: "update",
      task: "automatic-speech-recognition",
      data: data,
    });
    return data;
  }

  // Actually run transcription
  let output = await transcriber(audio, {
    // Greedy
    top_k: 0,
    do_sample: false,

    // Sliding window
    chunk_length_s: isDistilWhisper ? 20 : 30,
    stride_length_s: isDistilWhisper ? 3 : 5,

    // Language and task
    language: language,
    task: subtask,

    // Return timestamps
    return_timestamps: true,
    force_full_sequences: false,

    // Callback functions
    callback_function: callback_function, // after each generation step
    chunk_callback: chunk_callback, // after each chunk is processed
  }).catch((error) => {
    sendMessageToContentScript({
      status: "error",
      task: "automatic-speech-recognition",
      data: error,
    });
    return null;
  });

  return output;
};
