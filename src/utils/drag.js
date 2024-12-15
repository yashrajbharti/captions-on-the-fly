const wrapper = document.querySelector("floating-captions");

let isDragging = false;
let startX, startY, initialX, initialY;

// Common function to start dragging
function startDrag(e) {
  isDragging = true;

  // Use touch coordinates if it's a touch event
  const point = e.touches ? e.touches[0] : e;

  startX = point.clientX;
  startY = point.clientY;

  // Get the current position of the wrapper
  const rect = wrapper.getBoundingClientRect();
  initialX = rect.left;
  initialY = rect.top;

  // Prevent default behavior on touchstart or mousedown
  e.preventDefault();
}

// Common function to perform dragging
function drag(e) {
  if (!isDragging) return;

  // Use touch coordinates if it's a touch event
  const point = e.touches ? e.touches[0] : e;

  // Calculate the new position
  const deltaX = point.clientX - startX;
  const deltaY = point.clientY - startY;

  // Constrain the position within the screen bounds
  const newX = clamp(
    initialX + deltaX,
    0,
    window.innerWidth - wrapper.offsetWidth
  );
  const newY = clamp(
    initialY + deltaY,
    0,
    window.innerHeight - wrapper.offsetHeight
  );

  wrapper.style.left = `${newX}px`;
  wrapper.style.top = `${newY}px`;
}

// Common function to stop dragging
function stopDrag() {
  isDragging = false;
}

// Utility to clamp values within min and max bounds
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// Add event listeners for both mouse and touch
wrapper.addEventListener("mousedown", startDrag);
wrapper.addEventListener("touchstart", startDrag);

document.addEventListener("mousemove", drag);
document.addEventListener("touchmove", drag);

document.addEventListener("mouseup", stopDrag);
document.addEventListener("touchend", stopDrag);
