import { ShaderChunk } from "three";

// LIGHT LOOP
// three.js shades every pixel with every point light in the scene, also
// the ones whose light ends long before it gets there: it does all the
// arithmetic, two texture lookups included, and then multiplies the result
// by a colour of zero. The room has a dozen small lights (the candles, the
// lanterns, the two glows that follow the pointer and the playing song),
// each reaching a few metres, so for most pixels most of that work comes
// to nothing. It was about a quarter of what the graphics card did per
// frame.
//
// This puts the missing "if it reaches here" around it. A light in range is
// worked out as before and a light out of range adds the nothing it added
// before, so the picture is the same. (Measured: about twenty pixels in
// five million come out one step in 255 different, because the graphics
// card may now add the same numbers up in another order.)
//
// The two lookups inside are also told which level of their table to read
// (it only has the one), instead of working that out from neighbouring
// pixels: that is what lets every kind of graphics driver really skip
// them, and the value read is the same.
//
// These are edits to three.js's own shader text, made before anything is
// compiled, and only the standard material's shader takes the new path
// (it is the one the room is made of, and the one checked). If a future
// three.js words that text differently, the lines are not found, nothing
// at all is changed, and the room renders the stock way.
const SHADE = "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );";
// the point and spot lights come first in the chunk; sun-like lights have no range
const END_OF_RANGED_LIGHTS = "#if ( NUM_DIR_LIGHTS > 0 )";
const LOOKUPS = [
  ["vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;", "vec2 dfgV = textureLod( dfgLUT, vec2( material.roughness, dotNV ), 0.0 ).rg;"],
  ["vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;", "vec2 dfgL = textureLod( dfgLUT, vec2( material.roughness, dotNL ), 0.0 ).rg;"],
];

const loop = ShaderChunk.lights_fragment_begin;
const brdf = ShaderChunk.lights_physical_pars_fragment;
const cut = loop.indexOf(END_OF_RANGED_LIGHTS);
const ranged = loop.slice(0, cut);
if (cut > 0 && ranged.includes(SHADE) && LOOKUPS.every(([from]) => brdf.split(from).length === 2)) {
  const guarded = `\n#ifdef STANDARD\n\t\tif ( directLight.visible ) { ${SHADE} }\n#else\n\t\t${SHADE}\n#endif\n`;
  ShaderChunk.lights_fragment_begin = ranged.split(SHADE).join(guarded) + loop.slice(cut);
  ShaderChunk.lights_physical_pars_fragment = LOOKUPS.reduce((text, [from, to]) => text.replace(from, to), brdf);
}
