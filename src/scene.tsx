import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Stats } from '@react-three/drei'
import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js';
import { setTrackData, useStore, type Keyframe, type XYZT } from './store';
import { StretchedSphere } from './StrechedShpere';


export default function Scene() {

    return (
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }} style={{ background: 'black' }}>
            <ambientLight />
            <OrbitControls enableZoom={false} enablePan={false} />
            <gridHelper args={[20, 20, '#888', '#444']} />
            <GroundPlane />
            <Stats />

            <DrawingLine />

            {/* <DrawingPlane /> */}
            <Trajectories />
            <PlaybackPoints />
        </Canvas>
    )
}


const raycaster = new THREE.Raycaster()
function DrawingLine() {
    const { camera, gl } = useThree()
    const showRawTraj = useStore(state => state.showRawTraj);
    const [points, setPoints] = useState<{ pt: THREE.Vector3, t: number }[]>([])
    const [isDrawing, setIsDrawing] = useState(false)
    const lineRef = useRef<Line2>(null)

    const getPointOnCameraPlane = useCallback((clientX: number, clientY: number) => {
        // 鼠标归一化坐标
        const mouse = new THREE.Vector2()
        mouse.x = (clientX / window.innerWidth) * 2 - 1
        mouse.y = -(clientY / window.innerHeight) * 2 + 1

        const dir = new THREE.Vector3()
        camera.getWorldDirection(dir)
        // const planeCenter = new THREE.Vector3().copy(camera.position).add(dir.clone().multiplyScalar(1))
        const drawPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(dir, new THREE.Vector3(0, 0, 0))

        // 获取交点
        raycaster.setFromCamera(mouse, camera)
        const point = new THREE.Vector3()
        raycaster.ray.intersectPlane(drawPlane, point)

        return point
    }, [camera]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Alt') {
            if (isDrawing) return;
            e.preventDefault();
            setIsDrawing(true);
            setPoints([]);
            useStore.setState({ currentFrame: 0, playing: true });
        }
    }, [isDrawing]);

    const handlePointerMove = useCallback((e: PointerEvent) => {
        if (!isDrawing) return
        const pt = getPointOnCameraPlane(e.clientX, e.clientY)
        setPoints(prev => [...prev, { pt, t: Date.now() }])
    }, [isDrawing, getPointOnCameraPlane]);

    const handleKeyUp = useCallback(() => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (points.length < 2) return;
        const tStart = points[0].t;
        const duration = points[points.length - 1].t - tStart;
        const dt = 1000 / 24;
        const n = duration / dt;

        const data: XYZT[] = points.map(({ pt, t }) => { return { x: pt.x, y: pt.y, z: pt.z, t: (t - tStart) / 1000 } });

        const frames: Keyframe[] = [];
        let iScanPt = 0;
        for (let i = 0; i < n; i++) {
            const t = i * 1000 / 24;
            while (points[iScanPt].t - tStart <= t) {
                iScanPt++;
            }
            iScanPt--;

            const k = (points[iScanPt + 1].t - tStart - t) / (points[iScanPt + 1].t - points[iScanPt].t)
            const pt = new THREE.Vector3().copy(points[iScanPt].pt).multiplyScalar(k).add(
                new THREE.Vector3().copy(points[iScanPt + 1].pt).multiplyScalar(1 - k)
            );
            frames.push({ frame: i, pos: { x: pt.x, y: pt.y, z: pt.z }, idxInRaw: iScanPt + 1 - k });
        }

        setTrackData(data, frames);
        setPoints([]);
    }, [isDrawing, points]);

    useEffect(() => {
        const canvas = gl.domElement
        canvas.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            canvas.removeEventListener('pointermove', handlePointerMove)
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        }
    }, [gl.domElement, handlePointerMove, handleKeyDown, handleKeyUp])

    if (!showRawTraj) return <></>;
    return (
        <>
            {points.length > 1 && (
                <Line
                    ref={lineRef}
                    points={points.map(pt => pt.pt)}
                    color="red"
                    lineWidth={1}
                    dashed={false}
                />
            )}
        </>
    )
}


function Trajectories() {
    const tracks = useStore(state => state.tracks);
    const iSelected = useStore(state => state.selected);
    const showRawTraj = useStore(state => state.showRawTraj);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = useStore(state => state.flagDataChanged);

    if (!showRawTraj) return <></>

    return <>
        {tracks.map((track, i) => {
            if (track.rawDatas.length < 2) return;
            return <Line
                key={i}
                points={track.rawDatas.map(pt => [pt.x, pt.y, pt.z])}
                color="red"
                lineWidth={i === iSelected ? 2 : 1}
                dashed={false}
            />

        })}
    </>
}


function findKeyframe(keyframes: Keyframe[], iframe: number) {
    keyframes.sort((a, b) => a.frame - b.frame);
    const beforeFrames = keyframes.filter(f => f.frame <= iframe);
    return { sortedKeyframes: keyframes, idx: beforeFrames.length - 1 };
}


function PlaybackPoints() {
    const tracks = useStore(state => state.tracks);
    const iSelected = useStore(state => state.selected);

    return <>
        {tracks.map((_, i) => <PlaybackPoint key={i} iTrack={i} selected={i === iSelected} />)}
    </>
}

function PlaybackPoint({ iTrack, selected }: { iTrack: number, selected: boolean }) {
    const currentFrame = useStore(state => state.currentFrame);
    const obakeScale = useStore(state => state.obakeScale);
    const obakeType = useStore(state => state.obakeType);
    const track = useStore(state => state.tracks[iTrack]);
    const ref = React.useRef<THREE.Mesh>(null!)

    useFrame(() => {
        if (!ref.current) return;
        const { sortedKeyframes: kfs, idx } = findKeyframe(track.keyframes, currentFrame);
        const kf = kfs[idx];
        if (!kf) return;
        ref.current.position.set(kf.pos.x, kf.pos.y, kf.pos.z)
    })

    const { sortedKeyframes: kfs, idx } = findKeyframe(track.keyframes, currentFrame);
    const kf = kfs[idx];
    const noFrame = !kf;
    if (noFrame) return <></>;

    const prevKf = kfs[idx - 1];
    const nextKf = kfs[idx + 1];
    const dframe = prevKf ? kf.frame - prevKf.frame : nextKf ? nextKf.frame - kf.frame : 0;

    // type Raw
    const iRaw0 = Math.floor(kf.idxInRaw);
    const rawData0 = track.rawDatas[Math.max(0, iRaw0 - 4)];
    const rawData1 = track.rawDatas[Math.min(iRaw0 + 1 + 4, track.rawDatas.length - 1)];
    const dt = rawData1.t - rawData0.t;
    const vx = (rawData1.x - rawData0.x) / dt;
    const vy = (rawData1.y - rawData0.y) / dt;
    const vz = (rawData1.z - rawData0.z) / dt;
    const strechRaw = new THREE.Vector3(-vx, -vy, -vz).multiplyScalar(dframe / 24);

    // type Keyframes
    const strechKf = prevKf ? new THREE.Vector3(
        prevKf.pos.x - kf.pos.x, prevKf.pos.y - kf.pos.y, prevKf.pos.z - kf.pos.z
    ) : new THREE.Vector3(0, 0, 0);

    const strech = strechKf.clone().multiplyScalar(obakeType).add(
        strechRaw.clone().multiplyScalar(1 - obakeType)
    );

    const strechLength = strech.length() * obakeScale / 0.05;  // 0.05 is radius of point

    return (
        <StretchedSphere
            ref={ref}
            length={strechLength}
            direction={strech.normalize()}
            color={selected ? '#ff2' : '#aa2'}
        />
    )
}


function GroundPlane() {
    const planeRef = useRef<THREE.Mesh>(null);

    useEffect(() => {
        if (planeRef.current) {
            planeRef.current.position.copy(new THREE.Vector3(0, 0, 0))
            planeRef.current.lookAt(new THREE.Vector3(0, 1, 0));
        }
    })

    return (
        <mesh ref={planeRef} renderOrder={2}>
            <planeGeometry args={[5, 5]} />
            <meshBasicMaterial
                color="black"
                transparent opacity={0.5}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.NormalBlending}
            />
        </mesh>
    )
}