/**
 * Fit a chord sheet into a fixed box: the fewest columns that hold it at the start size, else the most
 * columns and smaller text until nothing spills. `box` must have a fixed height and overflow hidden;
 * `sheet` is its only child (its font size is changed).
 */
export function fitColumns(box: HTMLElement, sheet: HTMLElement, { start, min = 9, maxCols = 2 }: { start: number; min?: number; maxCols?: number }) {
  let font = start;
  // "" = not a multi-column box (with column-count 1 an overflow would spill into extra columns sideways)
  const set = (cols: number) => {
    box.style.columnCount = cols > 1 ? String(cols) : "";
    sheet.style.fontSize = `${font}px`;
  };
  const spills = () => box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1;
  for (let cols = 1; cols <= maxCols; cols++) {
    set(cols);
    if (!spills()) return { cols, font, fits: true };
  }
  while (spills() && font > min) {
    font -= 0.5;
    set(maxCols);
  }
  return { cols: maxCols, font, fits: !spills() };
}
