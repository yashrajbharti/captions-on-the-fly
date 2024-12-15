class FloatingCaptions extends HTMLElement {
  static get observedAttributes() {
    return ["time", "content", "type"]; // Watch for the new 'type' attribute
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.shadow.innerHTML = `
      <style>
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
      </style>
      <div class="captions-container" role="status"></div>
    `;
    this.container = this.shadow.querySelector(".captions-container");
    this.currentCaptions = []; // Array to store current captions
    this.captions = []; // The full list of captions
    this.lastUpdateTime = 0;
    this.wordInterval = null; // Timer for word-by-word appending
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "time") {
      this.updateCaptions(parseFloat(newValue)); // Update captions based on time
    } else if (name === "content") {
      this.captions = JSON.parse(newValue); // Update the full list of captions
    } else if (name === "type") {
      this.container.style.flexDirection =
        newValue === "scroll" ? "column" : "column-reverse"; // Change flex direction based on 'type'
      this.captions = []; // Reset captions on type change
      this.container.innerHTML = ""; // Clear the container
    }
  }
  isCaptionInView(timestamp) {
    const existingCaptions = this.container.querySelectorAll(".caption");
    let lastCaption = existingCaptions[existingCaptions.length - 1];

    // Check if the caption's timestamp is already in view
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

    // If type is 'scroll', use the scrolling behavior
    if (this.getAttribute("type") === "scroll") {
      activeCaptions.forEach(({ text, timestamp }) => {
        if (
          !this.container.querySelector(`[data-time-start="${timestamp[0]}"]`)
        ) {
          this.addCaption(text, timestamp); // Add new caption if not already displayed
        }
      });
    }
    // If type is 'append', use the word-by-word appending behavior
    else if (this.getAttribute("type") === "append") {
      activeCaptions.forEach(({ text }) => {
        if (!this.currentCaptions.toString().endsWith(text)) {
          this.currentCaptions.push(text);
          this.appendWords(text); // Append words one by one
        }
      });
    } else if (this.getAttribute("type") === "static") {
      activeCaptions.forEach(({ text }) => {
        if (!this.currentCaptions.toString().endsWith(text)) {
          this.currentCaptions = [text];
          this.container.textContent = text; // Append words
        }
      });
    }
  }

  // Handle scroll-based caption display
  addCaption(text, timestamp) {
    const captionElement = document.createElement("p");
    captionElement.classList.add("caption");
    captionElement.setAttribute("data-time-start", timestamp[0]);
    captionElement.setAttribute("data-time-end", timestamp[1]);
    captionElement.textContent = text;

    this.container.appendChild(captionElement);
    this.scrollToCaption(timestamp[0]); // Scroll to the new caption
  }

  // Scroll to the appropriate caption based on the start time
  scrollToCaption(timeStart) {
    const targetCaption = this.container.querySelector(
      `[data-time-start="${timeStart}"]`
    );
    if (targetCaption) {
      targetCaption.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // Append words one by one for 'append' type captions
  appendWords(text) {
    const words = text.split(" ");
    let wordIndex = 0;

    if (this.wordInterval) {
      clearInterval(this.wordInterval); // Clear previous interval
    }

    // Gradually append words
    this.wordInterval = setInterval(() => {
      if (wordIndex < words.length) {
        this.container.textContent += `${words[wordIndex]} `;
        wordIndex++;
      } else {
        clearInterval(this.wordInterval); // Stop when all words are appended
      }
    }, 100); // Append one word every 100ms
  }
}

// Define the custom element
customElements.define("floating-captions", FloatingCaptions);
