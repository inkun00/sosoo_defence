"""Prepare the twelve licensed launch samples. Never run during the web build.

Python dependencies: numpy, scipy, soundfile. Pass --ffmpeg /path/to/ffmpeg.
Download the source URLs in public/licenses/tower-audio-v1.json into
asset-sources/tower-audio/, and extract the five ZIPs into like-named folders.
Original downloads stay outside the public bundle. Reproduction requires the
same source files and tool versions; the report records both.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
import scipy
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'asset-sources' / 'tower-audio'
DEST = ROOT / 'public' / 'assets' / 'audio' / 'towers'
LICENSES = ROOT / 'public' / 'licenses'
RATE = 48000
SOURCES = {
    'bangs': {'title': '25 CC0 bang / firework SFX', 'author': 'rubberduck', 'url': 'https://opengameart.org/content/25-cc0-bang-firework-sfx', 'download': 'https://opengameart.org/sites/default/files/25-CC0-bang-sfx.zip', 'archive': 'bangs.zip'},
    'rpg': {'title': '80 CC0 RPG SFX', 'author': 'rubberduck', 'url': 'https://opengameart.org/content/80-cc0-rpg-sfx', 'download': 'https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip', 'archive': 'rpg.zip'},
    'battle': {'title': 'Battle Sound Effects', 'author': 'artisticdude', 'url': 'https://opengameart.org/content/battle-sound-effects', 'download': 'https://opengameart.org/sites/default/files/battle_sound_effects_0.zip', 'archive': 'battle.zip'},
    'ice': {'title': 'Ice spells', 'author': 'bart', 'url': 'https://opengameart.org/content/ice-spells', 'download': 'https://opengameart.org/sites/default/files/icespells.zip', 'archive': 'ice.zip'},
    'shatters': {'title': 'Ice breaking/shattering', 'author': 'IgnasD', 'url': 'https://opengameart.org/content/ice-breakingshattering', 'download': 'https://opengameart.org/sites/default/files/IceShatters_0.zip', 'archive': 'shatters.zip'},
    'buzz': {'title': 'Electric Buzz', 'author': 'themightyglider; original recording soundtracvkradio', 'url': 'https://opengameart.org/content/electric-buzz', 'originalUrl': 'https://freesound.org/people/soundtracvkradio/sounds/394679/', 'download': 'https://opengameart.org/sites/default/files/buzz_0.ogg', 'archive': 'buzz.ogg'},
    'electric': {'title': 'Spell sounds (electricspell2)', 'author': 'Augmentality / Brandon Morris; submitted by HaelDB', 'url': 'https://opengameart.org/content/spell-sounds', 'download': 'https://opengameart.org/sites/default/files/electricspell2.ogg', 'archive': 'electricspell2.ogg'},
    'magic': {'title': 'Magic Spell SFX (magical_7)', 'author': 'JaggedStone', 'url': 'https://opengameart.org/content/magic-spell-sfx', 'download': 'https://opengameart.org/sites/default/files/magical_7.ogg', 'archive': 'magical7.ogg'},
    'cannon': {'title': 'Cannon hit', 'author': 'Thimras', 'url': 'https://opengameart.org/content/cannon-hit', 'download': 'https://opengameart.org/sites/default/files/cannon_hit_0.ogg', 'archive': 'cannon-hit.ogg'},
}

def layer(file, seconds, gain=1, speed=1, at=0, high=55, low=11000, start=None):
    return dict(file=file, seconds=seconds, gain=gain, speed=speed, at=at, high=high, low=low, start=start)

# Double's two impulses are baked 65ms apart, so one gameplay shot consumes
# exactly one sample voice and still corresponds to one arithmetic subtraction.
RECIPES = {
    'basic': ('중형 철포탄 폭발', .55, ['bangs'], [layer('bangs/cannon_03.ogg', .53)]),
    'double': ('65ms 간격 쌍석포', .49, ['bangs', 'rpg'], [layer('bangs/bang_08.ogg', .4, .65, 1.2), layer('rpg/item_stone_03.ogg', .22, .65), layer('bangs/bang_08.ogg', .4, .65, 1.2, .065), layer('rpg/item_stone_03.ogg', .22, .65, 1, .065)]),
    'needle': ('금속 바늘과 빠른 바람', .29, ['rpg', 'battle'], [layer('rpg/blade_01.ogg', .19, 1, 1.4, high=400), layer('battle/battle_sound_effects/swish_2.wav', .23, .6, 1.35, high=800)]),
    'pebble': ('작은 돌이 흩어지는 자갈포', .46, ['rpg'], [layer('rpg/stones_04.ogg', .37, .8), layer('rpg/item_stone_02.ogg', .2, .6, 1.25, .035), layer('rpg/item_stone_04.ogg', .2, .45, 1.45, .1)]),
    'frost': ('냉기 구체와 얼음 울림', .65, ['ice', 'rpg'], [layer('ice/ice.wav', .62, .85, 1.1, high=200), layer('rpg/item_gem_02.ogg', .25, .3, .8, .045, high=400)]),
    'ice': ('날카로운 얼음창 파열', .58, ['shatters', 'ice', 'battle'], [layer('shatters/IceShatters/LedasLuzta2.ogg', .35, 1, 1.15, high=350), layer('ice/coldsnap.wav', .52, .6, 1.15, high=450), layer('battle/battle_sound_effects/swish_4.wav', .3, .45, 1.2, high=650)]),
    'catapult': ('나무 장력과 무거운 바위 비행', .78, ['rpg', 'battle'], [layer('rpg/wood_04.ogg', .5, .75, .8, low=5000), layer('rpg/stones_01.ogg', .67, .7, .78, .06, low=6500), layer('battle/battle_sound_effects/swish_3.wav', .62, .8, .82, low=5000)]),
    'lightning': ('연결된 전격의 지직거림과 방전', .31, ['buzz', 'electric'], [layer('buzz.ogg', .245, 1, 1, high=180, start=.18), layer('electricspell2.ogg', .26, .45, 2.2, high=500)]),
    'crystal': ('회전 수정의 유리 울림과 마법', .68, ['rpg', 'electric', 'magic'], [layer('rpg/item_gem_04.ogg', .44, .85, 1.25, high=550), layer('electricspell2.ogg', .57, .45, 1.6, high=850), layer('magical7.ogg', .58, .35, 1.7, .045, high=900)]),
    'sniper': ('날카로운 장거리 발사와 탄도', .38, ['bangs', 'battle', 'rpg'], [layer('bangs/shot_03.ogg', .22, 1, 1.1, high=200), layer('battle/battle_sound_effects/swish_4.wav', .24, .4, 1.6, high=900), layer('rpg/blade_03.ogg', .28, .3, 1.35, .025, high=1000)]),
    'siege': ('대포 폭발과 묵직한 저역 충격', .94, ['bangs', 'cannon'], [layer('bangs/cannon_02.ogg', .88, 1, .95), layer('cannon-hit.ogg', .86, .55, .85, .025, low=3500)]),
    'rune': ('쇠뇌 장력과 룬 마법 잔향', .76, ['battle', 'rpg', 'magic'], [layer('battle/battle_sound_effects/Bow.wav', .33, .9), layer('rpg/spell_01.ogg', .6, .6, .9, .025, high=250), layer('magical7.ogg', .64, .5, .8, .06, high=350)]),
}

def sha(file): return hashlib.sha256(file.read_bytes()).hexdigest()

def prepare_layer(recipe):
    path = (SOURCE / recipe['file']).resolve()
    if not path.is_relative_to(SOURCE.resolve()): raise ValueError('Invalid source path')
    x, sr = sf.read(path, always_2d=True, dtype='float32')
    x = x.mean(axis=1)
    if recipe['start'] is None:
        active = np.flatnonzero(np.abs(x) > max(.003, np.max(np.abs(x)) * .025))
        start = max(0, active[0] / sr - .003) if len(active) else 0
    else: start = recipe['start']
    x = x[int(start * sr):int((start + recipe['seconds'] * recipe['speed']) * sr)]
    rate = round(sr * recipe['speed'])
    common = np.gcd(RATE, rate)
    x = resample_poly(x, RATE // common, rate // common).astype(np.float32)
    if recipe['high']: x = sosfilt(butter(2, recipe['high'], 'highpass', fs=RATE, output='sos'), x)
    if recipe['low']: x = sosfilt(butter(2, recipe['low'], 'lowpass', fs=RATE, output='sos'), x)
    x = x / max(.001, np.max(np.abs(x))) * recipe['gain']
    fade = min(len(x) // 4, int(.018 * RATE))
    if fade: x[-fade:] *= np.linspace(1, 0, fade)
    return x, {'file': recipe['file'], 'sourceSha256': sha(path), 'sourceBytes': path.stat().st_size, 'trimStart': round(start, 6), **{k: v for k, v in recipe.items() if k not in ('file', 'start')}}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    previous_path = LICENSES / 'tower-audio-v1.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else None
    if previous:
        for source in previous['sources'].values():
            if sha(SOURCE / source['archive']) != source['downloadSha256']: raise ValueError('Original archive hash differs: ' + source['archive'])
        for clip in previous['towers'].values():
            for record in clip['layers']:
                if sha(SOURCE / record['file']) != record['sourceSha256']: raise ValueError('Original audio hash differs: ' + record['file'])
    DEST.mkdir(parents=True, exist_ok=True)
    cache = SOURCE / 'processed'
    cache.mkdir(exist_ok=True)
    report = {'version': 1, 'license': 'CC0-1.0', 'licenseUrl': 'https://creativecommons.org/publicdomain/zero/1.0/', 'sources': SOURCES, 'processing': {'rate': 24000, 'channels': 1, 'codec': 'MP3', 'bitrate': 64000, 'compressor': 'threshold=.05:ratio=4:attack=.05:release=35:makeup=1', 'targetPeak': .78, 'fadeInMs': 3, 'fadeOutMs': 35, 'metadata': 'removed', 'runtime': 'lazy loaded, decoded once, fingerprinted immutable cache'}, 'towers': {}}
    ffmpeg_version = subprocess.run([args.ffmpeg, '-version'], capture_output=True, text=True, check=True).stdout.splitlines()[0]
    report['tools'] = {'ffmpeg': ffmpeg_version, 'numpy': np.__version__, 'scipy': scipy.__version__, 'soundfile': sf.__version__, 'libsndfile': sf.__libsndfile_version__}
    for key, (description, seconds, sources, layers) in RECIPES.items():
        mix = np.zeros(round(seconds * RATE), dtype=np.float32)
        records = []
        for recipe in layers:
            data, record = prepare_layer(recipe)
            at = round(recipe['at'] * RATE)
            end = min(len(mix), at + len(data))
            mix[at:end] += data[:end-at]
            records.append(record)
        compression = subprocess.run([args.ffmpeg, '-v', 'error', '-f', 'f32le', '-ar', str(RATE), '-ac', '1', '-i', 'pipe:0', '-af', 'acompressor=threshold=0.05:ratio=4:attack=0.05:release=35:makeup=1', '-f', 'f32le', 'pipe:1'], input=mix.tobytes(), capture_output=True, check=True)
        mix = np.frombuffer(compression.stdout, dtype=np.float32).copy()
        mix *= .78 / max(.001, np.max(np.abs(mix)))
        fade_in, fade_out = round(.003 * RATE), round(.035 * RATE)
        mix[:fade_in] *= np.linspace(0, 1, fade_in)
        mix[-fade_out:] *= np.linspace(1, 0, fade_out)
        wav = cache / (key + '.wav')
        sf.write(wav, mix, RATE, subtype='PCM_16')
        output = DEST / (key + '.mp3')
        subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-i', str(wav), '-ar', '24000', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', '-write_xing', '0', '-id3v2_version', '0', str(output)], check=True)
        decoded, sr = sf.read(output, dtype='float32')
        peak = float(np.max(np.abs(decoded)))
        if peak > .97: raise ValueError(f'{key}: decoded audio clips ({peak})')
        if np.sqrt(np.mean(decoded**2)) < .025: raise ValueError(f'{key}: audio too quiet')
        info = sf.info(output)
        # Compare against the same finished clip as an ordinary stereo 48kHz
        # 16-bit WAV, not against unrelated unused files in an entire pack.
        stereo_wav_bytes = len(mix) * 2 * 2 + 44
        report['towers'][key] = {'description': description, 'sources': sources, 'layers': records, 'filename': key + '.mp3', 'sha256': sha(output), 'bytes': output.stat().st_size, 'duration': round(info.duration, 6), 'sourceDuration': seconds, 'referenceStereoWavBytes': stereo_wav_bytes, 'decodedPeak': round(peak, 6), 'decodedRms': round(float(np.sqrt(np.mean(decoded**2))), 6)}
    for source in SOURCES.values():
        archive = SOURCE / source['archive']
        source.update({'license': 'CC0-1.0', 'licenseUrl': report['licenseUrl'], 'downloadSha256': sha(archive)})
    report['totalBytes'] = sum(t['bytes'] for t in report['towers'].values())
    report['referenceStereoWavBytes'] = sum(t['referenceStereoWavBytes'] for t in report['towers'].values())
    report['reductionPercent'] = round(100 * (1 - report['totalBytes'] / report['referenceStereoWavBytes']), 2)
    (LICENSES / 'tower-audio-v1.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'bytes': report['totalBytes'], 'referenceStereoWavBytes': report['referenceStereoWavBytes'], 'reductionPercent': report['reductionPercent'], 'clips': {k: {'bytes': t['bytes'], 'seconds': t['duration'], 'peak': t['decodedPeak'], 'rms': t['decodedRms']} for k, t in report['towers'].items()}}, ensure_ascii=False))

if __name__ == '__main__': main()
