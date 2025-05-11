import { type XYZ } from "./store";


// https://en.wikipedia.org/wiki/Ramer–Douglas–Peucker_algorithm
export function approxPolyDP(pts: XYZ[], eps: number = 0.02) {
    if (pts.length < 3) return { pts: [...pts], idxs: pts.map((_, i) => i) };

    // Find the point with the maximum distance
    let dmax = 0
    let index = 0
    const iEnd = pts.length - 1
    for (let i = 1; i < iEnd; i++) {
        const d = perpendicularDistance(pts[i], pts[0], pts[iEnd]);
        // console.log(pts[i], pts[0], pts[iEnd], d);
        if (d > dmax) {
            index = i
            dmax = d
        }
    }

    let _pts: XYZ[] = [];
    let _idxs: number[] = [];

    // If max distance is greater than epsilon, recursively simplify
    if (dmax > eps) {
        // Recursive call
        const { pts: _ptsLeft, idxs: _idxsLeft } = approxPolyDP(pts.slice(0, index + 1), eps)
        const { pts: _ptsRight, idxs: _idxsRight } = approxPolyDP(pts.slice(index, iEnd + 1), eps)

        // Build the result list
        _ptsLeft.pop();
        _idxsLeft.pop();
        _pts = [..._ptsLeft, ..._ptsRight];
        _idxs = [..._idxsLeft, ..._idxsRight.map(i => i + index)];
    } else {
        _pts = [pts[0], pts[iEnd]];
        _idxs = [0, iEnd];
    }
    // Return the result
    return { pts: _pts, idxs: _idxs };
}


function perpendicularDistance(pt: XYZ, linePt0: XYZ, lintPt1: XYZ): number {
    const lineVec = subtract(lintPt1, linePt0)
    const vec = subtract(pt, linePt0);
    const lineVecNormSquare = normSquare(lineVec);

    if (lineVecNormSquare === 0) return Math.sqrt(normSquare(vec));

    // projVec = vec * lineVec / norm(lineVec) * lineVec / norm(lineVec)
    const projVec = scale(lineVec, dot(vec, lineVec) / lineVecNormSquare);
    const dVec = subtract(vec, projVec);
    return Math.sqrt(normSquare(dVec));
}

function subtract(pt1: XYZ, pt0: XYZ): XYZ {
    return { x: pt1.x - pt0.x, y: pt1.y - pt0.y, z: pt1.z - pt0.z };
}

function dot(v0: XYZ, v1: XYZ): number {
    return v0.x * v1.x + v0.y * v1.y + v0.z * v1.z;
}

function normSquare(pt: XYZ): number {
    return dot(pt, pt);
}

function scale(pt: XYZ, s: number): XYZ {
    return { x: pt.x * s, y: pt.y * s, z: pt.z * s };
}
