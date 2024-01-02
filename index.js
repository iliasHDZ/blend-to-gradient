// warning: spaghetti code lmfao
require('@g-js-api/g.js');

const fs = require('fs');
const OBJFile = require('obj-file-parser');
const path = require('path');

let dump = [];
const divideArray = (arr, numSubarrays) => Array.from({ length: numSubarrays }, (_, i) => arr.slice(i * Math.ceil(arr.length / numSubarrays), (i + 1) * Math.ceil(arr.length / numSubarrays)));
let add_all = (g) => g.objsf.forEach(x => $.add(x));

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const normalize = (a) => {
	const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
	return { x: a.x / len, y: a.y / len, z: a.z / len };
};
const avr = (...v) => v.reduce((sum, val) => sum + val, 0) / v.length;
	
let uc = unknown_c();
let invis_color = unknown_c();
let red = unknown_c();
invis_color.set(rgba(0, 0, 0, 0), 0, true);
red.set(rgb(255, 0, 0));

let obj_to_grad = (str, offset_x = 0, offset_y = 0, add = true, old_pos, fid) => {
    let objsf = [];
    const $obj = (new OBJFile(str)).parse().models[0];
    let ggroups = {};
    let curr_vert = 0;
    let ord = -1000;
    let grad_id = 1;

    const vertex = (x, y) => {
		if (add) {
			const gr = unknown_g();
			ggroups[curr_vert] = [gr, x, y];
			$.add({
				OBJ_ID: 1764,
				X: x + offset_x,
				Y: y + offset_y,
				GROUPS: [1, gr],
				COLOR: invis_color
			})
			curr_vert++;
			return gr;
		}  
		if (!old_pos) {
			const gr = unknown_g();
			ggroups[curr_vert] = [gr, x, y];
			objsf.push({
				OBJ_ID: 1764,
				X: x + offset_x,
				Y: y + offset_y,
				GROUPS: [1, gr],
				COLOR: invis_color
			})
			curr_vert++;
			return gr;
		}
		let real_diff = [x - old_pos[curr_vert][1], y - old_pos[curr_vert][2]]
		let diff = [real_diff[0] + offset_x, real_diff[1] + offset_y]
		ggroups[curr_vert] = [old_pos[curr_vert][0], x, y];
		old_pos[curr_vert][0].move(...diff);
		curr_vert++;
		return old_pos[curr_vert - 1][0];
    };
    const quad = (bl, br, tl, tr, col = 1, bgr = 1, layer) => {
        const hsv = `0a1a${bgr}a0a0`;
		// gradient trigger
        const o = { OBJ_ID: 2903, Y: 100 + grad_id * 10 * 3, X: fid * 25 * 3, ORD: ord, GR_BL: bl, GR_BR: br, GR_TL: tl, GR_TR: tr, GR_ID: grad_id, COLOR: col, COLOR_2: col, PREVIEW_OPACITY: 1, HVS_ENABLED: true, COLOR_2_HVS_ENABLED: true, HVS: hsv, COLOR_2_HVS: hsv, GR_VERTEX_MODE: true, GR_LAYER: layer };
        add ? $.add(o) : objsf.push(o);
        ord++; grad_id++;
    };
    const tri = (v1, v2, v3, col = 1, bgr = 1, layer) => {
        quad(v1, v2, v3, v3, col, bgr, layer);
    };
    const vertexToLight = normalize({ x: -0.5, y: 1, z: 0.5 });
    const calcBgrForNormal = (normal) => Math.min(1, Math.max(0, dot(normal, vertexToLight)));

    const centerPos = { x: 200, y: 200 };
    let vertexToGid = {};

    for (let i = 0; i < $obj.vertices.length; i++) {
        const v = $obj.vertices[i];
        vertexToGid[i + 1] = vertex(centerPos.x + v.x * 100, centerPos.y + v.y * 100);
    }

    let asf = [];
    for (let f of $obj.faces) {
        const vs = f.vertices;
        const n1 = $obj.vertexNormals[vs[0].vertexNormalIndex - 1];
        const n2 = $obj.vertexNormals[vs[1].vertexNormalIndex - 1];
        const n3 = $obj.vertexNormals[vs[2].vertexNormalIndex - 1];
        const bgr = calcBgrForNormal(normalize({ x: avr(n1?.x, n2?.x, n3?.x), y: avr(n1?.y, n2?.y, n3?.y), z: avr(n1?.z, n2?.z, n3?.z) }));
        let arga;
        let depth;
        if (vs.length == 4) {
            depth = avr($obj.vertices[vs[0].vertexIndex - 1].z, $obj.vertices[vs[1].vertexIndex - 1].z, $obj.vertices[vs[2].vertexIndex - 1].z, $obj.vertices[vs[3].vertexIndex - 1].z);
            arga = [vertexToGid[vs[3].vertexIndex], vertexToGid[vs[0].vertexIndex], vertexToGid[vs[2].vertexIndex], vertexToGid[vs[1].vertexIndex], uc, bgr, depth];
        } else {
            arga = [vertexToGid[vs[0].vertexIndex], vertexToGid[vs[1].vertexIndex], vertexToGid[vs[2].vertexIndex]];
            depth = avr($obj.vertices[vs[0].vertexIndex - 1].z, $obj.vertices[vs[1].vertexIndex - 1].z, $obj.vertices[vs[2].vertexIndex - 1].z);
            arga.push(uc, bgr, depth);
        }
        asf.push(arga);
    }

    asf = asf.sort((a, b) => a[a.length - 1] - b[b.length - 1]).map(x => x.slice(0, -1));

    let lrs = 8;
    let lre = 11;
    asf = divideArray(asf, lre - lrs);
    let layer = lrs;
    for (let a of asf) {
        for (let f of a) {
            f.length == 6 ? quad(...f, layer) : tri(...f, layer);
        }
        layer++;
    }

    return add ? ggroups : { objsf, ggroups };
};

const objs = JSON.parse(fs.readFileSync('frames.json').toString());

let fid = 0;
let a = obj_to_grad(objs[0], 20, -40, false, null, fid);
add_all(a);
fid++;
let ggr = a.ggroups;
let b = obj_to_grad(objs[1], 0, 0, false, ggr, fid);
b.objsf.forEach(x => $.add(x.obj ? x.obj : x));
for (let frame of objs.slice(1)) {
    fid++;
    wait(0.052);
    b = obj_to_grad(frame, 0, 0, false, ggr, fid);
    b.objsf.forEach(x => $.add(x.obj ? x.obj : x));
    ggr = b.ggroups;
}
$.exportToSavefile({ info: true });
