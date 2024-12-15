class FloatingCaptions {
  constructor(container) {
    this.container = container;
    this.container.classList.add("captions-container");
    this.currentCaptions = [];
    this.captions = [];
    this.lastUpdateTime = 0;
    this.wordInterval = null;

    this.initializeStyles();
  }

  // Apply styles programmatically
  initializeStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .captions-container {
          position: absolute;
          inset-block-start: 0;
          inset-inline-start: 50%;
          transform: translateX(-50%);
          background-color: oklch(0.09 0.04 353.1);
          color: oklch(0.96 0.02 354.49);
          padding: 0;
          border: 20px solid oklch(0.09 0.04 353.1);
          border-radius: 5px;
          font-size: 1rem;
          font-family: system-ui, sans-serif;
          text-align: start;
          inline-size: 600px;
          max-inline-size: 80vw;
          z-index: 9999;
          line-height: 1.5;
          block-size: 3em;
          white-space: pre-wrap;
          overflow: scroll;
          scrollbar-width: none;
          opacity: 0.9;
          transition: opacity 0.3s ease-in-out;
          display: flex;
        }
        .captions-container:empty {
          opacity: 0;
          pointer-events: none;
        }
        .caption {
          margin: 0;
        }
        .floating-wrapper {
          position: absolute;
          cursor: grab;
          /* Visual cue for dragging */
          inset-block-start: 80vh;
          inset-inline-start: 50%;
          translate: -50% 0;
        }
        .floating-wrapper:active {
            cursor: grabbing;
            /* Change cursor when dragging */
        }
      `;
    document.head.appendChild(style);
  }

  setAttribute(name, value) {
    if (name === "time") {
      this.updateCaptions(parseFloat(value));
    } else if (name === "content") {
      this.captions = JSON.parse(value);
    } else if (name === "type") {
      this.container.style.flexDirection =
        value === "scroll" ? "column" : "column-reverse";
      this.captions = [];
      this.container.innerHTML = "";
      this.container.setAttribute(name, value);
    }
  }

  isCaptionInView(timestamp) {
    const existingCaptions = this.container.querySelectorAll(".caption");
    let lastCaption = existingCaptions[existingCaptions.length - 1];
    return (
      lastCaption &&
      lastCaption.getAttribute("data-time-start") === timestamp[0] &&
      lastCaption.getAttribute("data-time-end") === timestamp[1]
    );
  }

  updateCaptions(currentTime) {
    const activeCaptions = this.captions.filter(
      ({ timestamp }) =>
        currentTime >= timestamp[0] && currentTime <= timestamp[1]
    );

    if (this.container.getAttribute("type") === "scroll") {
      activeCaptions.forEach(({ text, timestamp }) => {
        if (
          !this.container.querySelector(`[data-time-start="${timestamp[0]}"]`)
        ) {
          this.addCaption(text, timestamp);
        }
      });
    } else if (this.container.getAttribute("type") === "append") {
      activeCaptions.forEach(({ text }) => {
        if (!this.currentCaptions.toString().endsWith(text)) {
          this.currentCaptions.push(text);
          this.appendWords(text);
        }
      });
    } else if (this.container.getAttribute("type") === "static") {
      activeCaptions.forEach(({ text }) => {
        if (!this.currentCaptions.toString().endsWith(text)) {
          this.currentCaptions = [text];
          this.container.textContent = text;
        }
      });
    }
  }

  addCaption(text, timestamp) {
    const captionElement = document.createElement("p");
    captionElement.classList.add("caption");
    captionElement.setAttribute("data-time-start", timestamp[0]);
    captionElement.setAttribute("data-time-end", timestamp[1]);
    captionElement.textContent = text;

    this.container.appendChild(captionElement);
    this.scrollToCaption(timestamp[0]);
  }

  scrollToCaption(timeStart) {
    const targetCaption = this.container.querySelector(
      `[data-time-start="${timeStart}"]`
    );
    if (targetCaption) {
      targetCaption.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  appendWords(text) {
    const words = text.split(" ");
    let wordIndex = 0;

    if (this.wordInterval) {
      clearInterval(this.wordInterval);
    }

    this.wordInterval = setInterval(() => {
      if (wordIndex < words.length) {
        this.container.textContent += `${words[wordIndex]} `;
        wordIndex++;
      } else {
        clearInterval(this.wordInterval);
      }
    }, 100);
  }
}
