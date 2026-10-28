type Rect = { left: number; top: number; width: number; height: number };

export function expandedCardBounds(canvas: Rect, frame: Rect, frameWidth: number) {
  const scale = frameWidth > 0 ? frame.width / frameWidth : 1;
  const ratio = scale > 0 ? scale : 1;
  return {
    left: (canvas.left + canvas.width / 6 - frame.left) / ratio,
    top: (canvas.top + canvas.height / 2 - frame.top) / ratio,
    width: canvas.width * 2 / 3 / ratio,
    maxHeight: canvas.height / ratio,
  };
}

export const cardControls = 'button, a, input, textarea, select, [role="checkbox"], [contenteditable="true"]';
