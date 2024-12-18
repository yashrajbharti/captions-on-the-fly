# Auto-Generate Captions Chrome Extension

## Introduction

This project demonstrates the feasibility of real-time, auto-generated captions on the web, supporting the [Auto-Generated Captions API Proposal](https://github.com/yashrajbharti/auto-generate-captions-video). Inspired by feedback and motivation from Adam Argyle and the Chrome Team, this extension showcases how live captions can be integrated into web videos dynamically.

<img width="1645" alt="Captions on the fly for both vanilla and chrome extension" src="https://github.com/user-attachments/assets/579c4873-2610-40d1-b90e-a0e0625d0b93" />


## Features

- **Real-time Captioning**: Captions are generated dynamically on the fly.
- **Modes**: Three modes available in the vanilla version:
  - **Static Mode**: Fixed captions displayed without scrolling.
  - **Scroll Mode**: Captions scroll dynamically as they are generated (used in the Chrome extension).
  - **Append Mode**: Captions accumulate below the video.
- **HuggingFace and Transformers JS**: Leveraging advanced machine learning models for accurate transcription.
- **Chrome Extension**: Focused on Scroll Mode for seamless captioning directly in the browser.

## Motivation

This project was developed to:

- Validate the practicality of the `autogenerate` attribute proposed for the `<track>` element.
- Enhance web accessibility by enabling captions as a default feature, as only 0.5% of videos have it as per *Web Almanac by HTTP archive*.

> [!Important]
> This can help to showcase the power of Chrome's Gemini Nano API as a potential backend for AI-powered captioning. With the release of Prompt API, Writer and Rewriter API and Translate API just to name a few, this can be another powerful addition to the **window.ai** APIs.

## How It Works

### Vanilla JavaScript Version

The vanilla version supports:

1. **Static Mode**
2. **Scroll Mode**
3. **Append Mode**

To use:

- Open the provided examples.
- Play the video.
- Observe the auto-generated captions in the mode of your choice.

### Chrome Extension

The extension implements the **Scroll Mode** exclusively:

1. Clone the repository locally.
2. Visit `chrome://extensions` in your Chrome browser.
3. Click "Load unpacked" and select the cloned repository folder.
4. Visit a website with videos that allow fetching.
5. Play a video to see auto-captions appear dynamically.

**Note**: The extension only works on websites that permit fetching the video.

## Instructions

1. **Install and Set Up**:
   - For the vanilla version: Load the example files in a local environment.
   - For the Chrome extension: Clone the repository and load it into Chrome as described above.
2. **Play Video**:
   - Captions start automatically when a video is played.
3. **Switch Modes (Vanilla Only)**:
   - Modify the code to toggle between Static, Scroll, and Append modes.

## Future Enhancements

- **Gemini Nano Integration**:
  Chrome’s Gemini Nano API is a promising tool for improving transcription efficiency and accuracy. Future iterations will incorporate Gemini Nano for enhanced performance.
- **Live Caption Support**:
  Extend functionality to support live-streamed videos, enabling real-time accessibility.
- **Cross-Browser Compatibility**:
  Collaborate with other browser vendors to standardize the feature across platforms.

## References

- [Auto-Generated Captions API Proposal](https://github.com/yashrajbharti/auto-generate-captions-video)
- HuggingFace and Transformers JS
- Inspiration from the Chrome Team (Thomas Steiner and Adam Argyle)
- Gemini Nano API by Chrome (for future versions)

## Acknowledgements

Special thanks to:

- The Chrome Team
- HuggingFace community for their ML tools
