// The model video (the bridge demo). Every new video copies this folder and changes story.ts, build.ts, cast.ts.
import { BridgeShort, BRIDGE_FRAMES } from "./Bridge";
import words from "./words.json";
export const video = { id: "modele", frames: BRIDGE_FRAMES, Scene: BridgeShort, words };
