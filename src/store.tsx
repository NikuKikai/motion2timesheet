
import { create } from "zustand";

export type XYZ = { x: number, y: number, z: number };
export type XYZT = { t: number, x: number, y: number, z: number };

export type Keyframe = {
    frame: number,
    pos: XYZ,
    idxInRaw: number,  // float
}

export type TimeTrack = {
    rawDatas: XYZT[],
    keyframes: Keyframe[]
}

type StoreType = {
    tracks: TimeTrack[],
    currentFrame: number,
    playing: boolean,
    selected: number,

    obakeType: number,
    obakeScale: number,

    // UI
    showRawTraj: boolean,
    maxFrame: number,
    flagDataChanged: number,
};

export const useStore = create<StoreType>(() => ({
    tracks: [{ keyframes: [], rawDatas: [] }],
    currentFrame: 0,
    playing: false,
    selected: 0,
    obakeType: 0,
    obakeScale: 0.5,
    showRawTraj: true,
    maxFrame: 24,
    flagDataChanged: 0,
}))

export const reset = () => useStore.setState({
    tracks: [{ keyframes: [], rawDatas: [] }],
    currentFrame: 0,
    playing: false,
    selected: 0,
    obakeType: 0,
    obakeScale: 0.5,
    showRawTraj: true,
    maxFrame: 24,
    flagDataChanged: Date.now(),
});

export const setCurrentFrame = (currentFrame: number) => useStore.setState({
    currentFrame,
});

export const setSelectedTrack = (idx: number) => useStore.setState({
    selected: idx,
});

export const addTrack = () => useStore.setState(s => {
    s.tracks = [...s.tracks, { keyframes: [], rawDatas: [] }]
    return { ...s };
});

export const prevFrame = () => useStore.setState({
    currentFrame: (useStore.getState().currentFrame - 1) % useStore.getState().maxFrame,
});

export const nextFrame = () => useStore.setState({
    currentFrame: (useStore.getState().currentFrame + 1) % useStore.getState().maxFrame,
});


export const setTrackData = (data: XYZT[], keyframes: Keyframe[]) => useStore.setState(s => {
    s.tracks[s.selected].keyframes = keyframes;
    s.tracks[s.selected].rawDatas = data;
    s.maxFrame = getOverallLastKeyframe().frame + 8;
    return { ...s, flagDataChanged: Date.now() };
});

export const setTrackKeyframes = (keyframes: Keyframe[]) => useStore.setState(s => {
    s.tracks[s.selected].keyframes = keyframes;
    s.maxFrame = getOverallLastKeyframe().frame + 8;
    return { ...s, flagDataChanged: Date.now() };
});


// --------------- Getter ----------------

export const getTrackLastKeyframe = (iTrack: number) => {
    const s = useStore.getState();
    return s.tracks[iTrack].keyframes.reduce((a, b) => a.frame > b.frame ? a : b);
}

export const getOverallLastKeyframe = () => {
    const s = useStore.getState();
    const kfs = s.tracks.map((_, i) => getTrackLastKeyframe(i));
    return kfs.reduce((a, b) => a.frame > b.frame ? a : b);
}
