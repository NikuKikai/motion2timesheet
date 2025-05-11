import * as THREE from 'three'
import { useRef, useMemo, forwardRef } from 'react'

type Props = {
    radius?: number,
    direction?: THREE.Vector3,
    length?: number,
    position?: THREE.Vector3,
    color?: string | THREE.Color,
}

export const StretchedSphere = forwardRef(function StretchedSphere({
    radius = 0.05,
    direction = new THREE.Vector3(1, 0, 0),
    length = 0.5,
    position = new THREE.Vector3(0, 0, 0),
    color = 'yellow',
}: Props, ref) {
    const meshRefDefault = useRef<THREE.Mesh>(null);
    const meshRef = ref || meshRefDefault;

    const geometry = useMemo(() => {
        const geo = new THREE.SphereGeometry(radius, 32, 32);
        const posAttr = geo.attributes.position as THREE.BufferAttribute
        const dir = direction.clone().normalize()

        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i)
            const y = posAttr.getY(i)
            const z = posAttr.getZ(i)

            const vertex = new THREE.Vector3(x, y, z);  // local pos
            const stretchFactor = Math.max(vertex.dot(dir), 0);

            const displaced = vertex.addScaledVector(dir, length * stretchFactor)
            posAttr.setXYZ(i, displaced.x, displaced.y, displaced.z)
        }

        posAttr.needsUpdate = true
        geo.computeVertexNormals()

        return geo;
    }, [radius, direction.x, direction.y, direction.z, length]);

    return (
        <mesh ref={meshRef} geometry={geometry} position={position}>
            <meshStandardMaterial color={color} />
        </mesh>
    )
});
