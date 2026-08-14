interface P {
  className?: string;
}

const S = (d: string, w = 1.7) => (p: P) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={w}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={p.className}
    aria-hidden
  >
    <path d={d} />
  </svg>
);

export const IconGrid = S('M4 4h16v16H4z M4 9.33h16 M4 14.67h16 M9.33 4v16 M14.67 4v16');
export const IconPlay = S('M7 4.8 19 12 7 19.2z');
export const IconPause = S('M8.5 5v14 M15.5 5v14');
export const IconStep = S('M6 5v14 M10 12l8-6v12z');
export const IconStop = S('M6.5 6.5h11v11h-11z');
export const IconBolt = S('M13.2 2.5 4.8 13.4h6L9.9 21.5l8.4-10.9h-6z');
export const IconTree = S('M12 3v5 M12 8 6.5 12v3 M12 8l5.5 4v3 M4.5 15h4v4h-4z M10 19h4v-4h-4z M15.5 15h4v4h-4z');
export const IconSparkle = S(
  'M12 3.2 13.7 9l5.8 1.7-5.8 1.7L12 18.2l-1.7-5.8L4.5 10.7 10.3 9z M18.6 3.4l.7 2.2 2.2.7-2.2.7-.7 2.2-.7-2.2-2.2-.7 2.2-.7z',
);
export const IconClock = S('M12 3.8a8.2 8.2 0 1 1 0 16.4 8.2 8.2 0 0 1 0-16.4z M12 7.6V12l3 1.8');
export const IconUndo = S('M4 9h9.5a5.5 5.5 0 0 1 0 11H9 M4 9l4-4 M4 9l4 4');
export const IconRedo = S('M20 9h-9.5a5.5 5.5 0 0 0 0 11H15 M20 9l-4-4 M20 9l-4 4');
export const IconTrash = S('M4.5 6.5h15 M9.5 6.5V4.2h5v2.3 M6.5 6.5l1 13h9l1-13');
export const IconClose = S('M6.8 6.8l10.4 10.4 M17.2 6.8L6.8 17.2');
export const IconGrip = S('M9 5.5h.01 M15 5.5h.01 M9 12h.01 M15 12h.01 M9 18.5h.01 M15 18.5h.01', 2.6);
export const IconWand = S('M4.5 19.5 15 9 M17 3.2l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z M6 4l.6 1.6L8.2 6.2 6.6 6.8 6 8.4l-.6-1.6L3.8 6.2l1.6-.6z');
export const IconLightbulb = S(
  'M9.2 17.5h5.6 M10 20.5h4 M12 3.5a5.6 5.6 0 0 1 3.4 10.1c-.6.5-.9 1.1-.9 1.7H9.5c0-.6-.3-1.2-.9-1.7A5.6 5.6 0 0 1 12 3.5z',
);

/** Silhueta de rainha de xadrez. */
export function QueenGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M50 15.5a7.4 7.4 0 0 1 4 13.6l6 12.4 11-10.6a6.9 6.9 0 1 1 4.6 2.6l-5.6 28.6H30L24.4 33.5a6.9 6.9 0 1 1 4.6-2.6l11 10.6 6-12.4a7.4 7.4 0 0 1 4-13.6z"
      />
      <path fill="currentColor" d="M29.4 66.4h41.2l1.7 7.6H27.7z" />
      <path fill="currentColor" d="M25.6 78h48.8l2.6 8.5H23z" />
    </svg>
  );
}
