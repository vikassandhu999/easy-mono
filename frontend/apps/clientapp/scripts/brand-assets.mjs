import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {Flower2} from 'lucide-react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import sharp from 'sharp';

const root = new URL('../', import.meta.url);
const cream = '#fff9f3';
const purple = '#5740be';
const svg = ({size, inset, background, radius = 0}) =>
  renderToStaticMarkup(
    createElement(
      'svg',
      {xmlns: 'http://www.w3.org/2000/svg', width: size, height: size, viewBox: `0 0 ${size} ${size}`},
      background && createElement('rect', {width: size, height: size, rx: radius, fill: background}),
      createElement(Flower2, {
        x: inset,
        y: inset,
        width: size - 2 * inset,
        height: size - 2 * inset,
        color: purple,
        strokeWidth: 2,
      }),
    ),
  );
const png = async (path, source, opaque = false) => {
  const image = sharp(Buffer.from(source));
  await (opaque ? image.removeAlpha() : image).png().toFile(fileURLToPath(new URL(path, root)));
};

await mkdir(new URL('public/', root), {recursive: true});
await writeFile(new URL('public/icon.svg', root), svg({size: 128, inset: 22, background: cream, radius: 28}));
await png(
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
  svg({size: 1024, inset: 190, background: cream}),
  true,
);
for (const scale of [1, 2, 3]) {
  await png(
    `ios/App/App/Assets.xcassets/Splash.imageset/flower${scale === 1 ? '' : `@${scale}x`}.png`,
    svg({size: 128 * scale, inset: 14 * scale}),
  );
}
for (const [density, scale] of [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
]) {
  const base = `android/app/src/main/res/mipmap-${density}`;
  // Keep the complete mark inside Android's central adaptive-icon safe zone.
  await png(`${base}/ic_launcher_foreground.png`, svg({size: 108 * scale, inset: 26 * scale}));
  await png(
    `${base}/ic_launcher.png`,
    svg({size: 48 * scale, inset: 9 * scale, background: cream, radius: 11 * scale}),
  );
  await png(
    `${base}/ic_launcher_round.png`,
    svg({size: 48 * scale, inset: 9 * scale, background: cream, radius: 24 * scale}),
  );
}
process.stdout.write('Generated Easy browser, iOS and Android brand assets.\n');
