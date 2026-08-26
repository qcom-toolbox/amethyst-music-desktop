import type { SVGProps } from "react";

function Svg(props: SVGProps<SVGSVGElement>) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...props} />;
}

export const PlayIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M8 5v14l11-7z" />
  </Svg>
);
export const PauseIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </Svg>
);
export const NextIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M6 5v14l8-7zM16 5h2v14h-2z" />
  </Svg>
);
export const PrevIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M18 5v14l-8-7zM6 5h2v14H6z" />
  </Svg>
);
export const ShuffleIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M17 3l4 4-4 4v-3h-3.6l-2-2H17V3zM3 6h4.4l7.2 8.8L17 17v3l4-4-4-4v3l-2.6-2.6L7.4 8H3V6zm0 12h4.4l2-2.6L8 14l-1.4 1.6H3v2z" />
  </Svg>
);
export const RepeatIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
  </Svg>
);
export const RepeatOneIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zM11 9h1v4h-1V9.8L10 10V9.2z" />
  </Svg>
);
export const VolumeIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M4 9v6h4l5 5V4L8 9H4zm11.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
  </Svg>
);
export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
  </Svg>
);
export const MusicNoteIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M9 3v10.55A4 4 0 1 0 11 17V7h6V3z" />
  </Svg>
);
export const AlbumIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9zm0 13.5A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5zm0-7A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5z" />
  </Svg>
);
export const ArtistIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 4v2h16v-2c0-2.3-4.7-4-8-4z" />
  </Svg>
);
export const PlaylistIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M3 6h13v2H3zm0 5h13v2H3zm0 5h9v2H3zM19 9v6.18A2.5 2.5 0 1 0 20 17V11h3V9z" />
  </Svg>
);
export const SettingsIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M19.14 12.94a7.07 7.07 0 0 0 .05-.94 7.07 7.07 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.3 7.3 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.3 7.3 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0-.05.94 7.07 7.07 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.04.71 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.3 7.3 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z" />
  </Svg>
);
export const LogoutIcon = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M16 13v-2H7V8l-5 4 5 4v-3zM20 3h-8v2h8v14h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
  </Svg>
);
