import React, { useEffect } from 'react'
import { useStore, nextFrame, setCurrentFrame, setSelectedTrack, addTrack, setTrackKeyframes } from './store'
import { approxPolyDP } from './approxPoly';


export function TimelinePanel() {

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '160px',
                width: '100vw',
                background: '#333',
                borderTop: '1px solid gray',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
                boxSizing: 'border-box',
            }}
        >
            <ButtonPanel />
            <TimeSheetPanel />
        </div>
    )
}


const baseButtonStyle: React.CSSProperties = {
    width: '22px', minWidth: '22px',
    height: '22px', minHeight: '22px',
    background: 'transparent',
    color: 'white',
    border: '1px solid white',
    cursor: 'pointer',
    boxSizing: 'border-box',
    verticalAlign: 'middle',
    margin: 0,
    marginRight: '8px',
    fontSize: '10px',
}


function ButtonPanel() {
    const playing = useStore(state => state.playing);
    const showRawTraj = useStore(state => state.showRawTraj);
    const tracks = useStore(state => state.tracks);
    const iSelected = useStore(state => state.selected);
    const obakeScale = useStore(state => state.obakeScale);
    const obakeType = useStore(state => state.obakeType);


    useEffect(() => {
        if (!playing) return
        const interval = setInterval(() => {
            nextFrame();
        }, 1000 / 24)

        return () => clearInterval(interval)
    }, [playing])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ') {
                useStore.setState({ playing: !playing })
            }
        }
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    }, [playing])


    const handleApproxTrack = () => {
        const track = tracks[iSelected];
        const kfs = track.keyframes.sort((a, b) => a.frame - b.frame);
        const pts = kfs.map(kf => kf.pos);
        const { idxs } = approxPolyDP(pts, 0.02);

        const _idxs: number[] = [];
        let lastFrm = 0;
        for (const i of idxs) {
            if (i === 0 || i === kfs.length - 1) {
                _idxs.push(i); continue;
            }
            if (kfs[i].frame < lastFrm + 2) continue;
            _idxs.push(i);
            lastFrm = kfs[i].frame;
        }

        const _kfs = _idxs.map(i => kfs[i]);
        setTrackKeyframes(_kfs);
    }


    return (
        <div style={{
            width: 240, minWidth: 200, height: '100%',
            boxSizing: 'border-box',
            padding: '4px 4px',
            fontSize: '11px',
        }}>
            <div>
                <button
                    onClick={() => useStore.setState({ playing: !playing })}
                    style={baseButtonStyle}
                >
                    {playing ? '||' : '▶'}
                </button>
            </div>
            <div style={{ marginTop: '4px' }}>
                <button
                    onClick={() => { useStore.setState({ showRawTraj: !showRawTraj }) }}
                    style={{
                        ...baseButtonStyle,
                        borderWidth: '4px',
                        background: showRawTraj ? 'white' : 'transparent',
                    }}
                />
                <span>Show Trajectory</span>
            </div>
            <div style={{ marginTop: '4px' }}>
                <button
                    onClick={handleApproxTrack}
                    style={{
                        ...baseButtonStyle,
                    }}
                >
                    A
                </button>
                <span>Reduce Keyframes</span>
            </div>
            <div style={{ marginTop: '4px', border: '1px dashed gray' }}>
                <div style={{ marginRight: '10px' }}>Obake</div>
                <div style={{ marginLeft: '18px' }}>
                    <span>Original</span>
                    <input
                        type='range'
                        style={{ margin: '0 4px', width: '100px', height: '10px' }}
                        min={0} max={1} step={0.05}
                        value={obakeType}
                        onChange={e => { useStore.setState(s => ({ ...s, obakeType: Number(e.target.value) })) }}
                    />
                    <span>Keyframs</span>
                </div>
                <div style={{ marginLeft: '18px' }}>
                    <span>Scale&nbsp;&nbsp;&nbsp;</span>
                    <input
                        type='range'
                        style={{ margin: '0 4px', width: '100px', height: '10px' }}
                        min={0} max={1} step={0.1}
                        value={obakeScale}
                        onChange={e => { useStore.setState(s => ({ ...s, obakeScale: Number(e.target.value) })) }}
                    />
                </div>
            </div>
        </div>

    )
}



const containerStyle: React.CSSProperties = {
    height: '100%', flexGrow: 1,
    overflow: 'auto',
    backgroundColor: '#111', border: '1px solid #333',
}

const baseCellStyle: React.CSSProperties = {
    border: '1px solid #111',
    boxSizing: 'border-box',
    textAlign: 'center',
    fontSize: '12px',
    lineHeight: '20px',
    width: '20px',
    height: '20px',
    background: '#444',
    overflow: 'hidden',
    userSelect: 'none',
}

const firstColStyle: React.CSSProperties = {
    ...baseCellStyle,
    width: '100px',
    position: 'sticky',
    left: 0,
    background: '#2a2a2a',
    zIndex: 2,
    fontWeight: 'bold',
}

const firstRowStyle: React.CSSProperties = {
    border: '1px solid transparent',
    position: 'sticky',
    top: 0,
    background: '#111',
    zIndex: 3,
}

const cornerCellStyle: React.CSSProperties = {
    ...firstColStyle,
    ...firstRowStyle,
    background: '#111',
    zIndex: 4,
}

function TimeSheetPanel() {
    const currentFrame = useStore(state => state.currentFrame);
    const tracks = useStore(state => state.tracks);
    const selected = useStore(state => state.selected);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = useStore(state => state.flagDataChanged);
    const maxFrame = useStore(state => state.maxFrame);

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: `100px repeat(${maxFrame}, 20px)`,
        gridAutoRows: '20px',
        width: 'max-content',
    }

    return (
        <div style={containerStyle}>
            <div style={gridStyle}>
                {/* Corner */}
                <div style={cornerCellStyle}>Track/Time</div>

                {/* Header */}
                {Array.from({ length: maxFrame }).map((_, i) => {
                    const frameSelected = currentFrame === i;

                    return <div
                        key={`frame-header-${i}`}
                        style={{
                            ...baseCellStyle,
                            ...firstRowStyle,
                            ...(frameSelected ? { background: '#444' } : {})
                        }}
                    >
                        {i % 24 === 0 ? <b>{i / 24}</b> : <span style={{ color: '#999' }}>{i % 24}</span>}
                    </div>
                })}

                {/* Track */}
                {tracks.map((track, itr) => {
                    const isKeyframe = (frame: number) => track.keyframes.some((kf) => kf.frame === frame)
                    const trackSelected = selected === itr;
                    const trackStyle = { ...firstColStyle, ... (trackSelected ? { background: '#3a3a3a' } : {}) };

                    return <React.Fragment key={`track-${itr}`}>
                        {/* Track Label */}
                        <div
                            style={trackStyle}
                            onClick={() => { setSelectedTrack(itr); }}
                        >
                            Tr.{itr}
                        </div>

                        {/* Track Cells */}
                        {Array.from({ length: maxFrame }).map((_, ifrm) => {
                            const frameSelected = currentFrame === ifrm;
                            const highlight = Number(frameSelected) + Number(trackSelected);
                            const highlightStyle = { background: highlight === 2 ? '#666' : highlight === 1 ? '#555' : baseCellStyle.background };
                            const cellStyle = { ...baseCellStyle, ...highlightStyle };

                            return <div
                                key={`cell-${itr}-${ifrm}`}
                                style={cellStyle}
                                onClick={() => {
                                    setCurrentFrame(ifrm);
                                    setSelectedTrack(itr);
                                }}
                            >
                                <span style={{ display: 'inline-block', transform: 'translate(0, -1px)' }}> {isKeyframe(ifrm) ? 'o' : ''}</span>
                            </div>
                        })}
                    </React.Fragment>
                })}

                <div
                    style={firstColStyle}
                    onClick={() => { addTrack(); }}
                >
                    +Track
                </div>

            </div>
        </div>
    )
}