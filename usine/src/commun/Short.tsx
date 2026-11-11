// One finished Short: the 3D scene of the video + the subtitles burned on top.
import React from "react";
import { AbsoluteFill, getInputProps } from "remotion";
import { VIDEOS } from "../videos/liste";
import { SousTitres } from "./SousTitres";

export const Short: React.FC<{ id: string }> = ({ id }) => {
  const v = VIDEOS.find((x) => x.id === id)!;
  const sub = (getInputProps() as { soustitres?: boolean }).soustitres ?? true;
  const Scene = v.Scene;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Scene />
      {sub && v.words.length > 0 ? <SousTitres words={v.words} /> : null}
    </AbsoluteFill>
  );
};
