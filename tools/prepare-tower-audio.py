"""Prepare the twelve licensed launch samples. Never run during the web build.

Python dependencies: numpy, scipy, soundfile. Pass --ffmpeg /path/to/ffmpeg.
Download the source URLs in public/licenses/tower-audio-v1.json into
asset-sources/tower-audio/v2/. Extract tinysized.zip, magic-attacks.zip and
shots.7z into tinysized/, magic-attacks/ and shots/ respectively.
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
SOURCE = ROOT / 'asset-sources' / 'tower-audio' / 'v2'
DEST = ROOT / 'public' / 'assets' / 'audio' / 'towers'
LICENSES = ROOT / 'public' / 'licenses'
RATE = 48000
LICENSE_URLS = {'CC0-1.0': 'https://creativecommons.org/publicdomain/zero/1.0/', 'CC-BY-3.0': 'https://creativecommons.org/licenses/by/3.0/', 'CC-BY-4.0': 'https://creativecommons.org/licenses/by/4.0/'}
SOURCES = {
    'cannon': {'title': 'Cannon fire', 'author': 'Thimras', 'url': 'https://opengameart.org/content/cannon-fire', 'download': 'https://opengameart.org/sites/default/files/cannon_fire_0.ogg', 'archive': 'cannon-fire.ogg', 'license': 'CC0-1.0'},
    'foley': {'title': 'Fantasy Sound Effects (Tinysized SFX)', 'author': 'Vehicle / Jan Schupke', 'url': 'https://opengameart.org/content/fantasy-sound-effects-tinysized-sfx', 'download': 'https://opengameart.org/sites/default/files/tinysized.zip', 'archive': 'tinysized.zip', 'license': 'CC0-1.0'},
    'magic': {'title': '8 Magic Attacks', 'author': 'leohpaz', 'url': 'https://opengameart.org/content/8-magic-attacks', 'download': 'https://opengameart.org/sites/default/files/8_rpg_battle_magic_sfx_free_samples.zip', 'archive': 'magic-attacks.zip', 'license': 'CC-BY-4.0'},
    'electric': {'title': 'Electricity Sound Effects', 'author': 'Brian MacIntosh / BMacZero', 'url': 'https://opengameart.org/content/electricity-sound-effects-0', 'download': 'https://opengameart.org/sites/default/files/continuousspark.wav', 'archive': 'continuous-spark.wav', 'license': 'CC0-1.0'},
    'spark': {'title': 'Electricity Sound Effects (spark)', 'author': 'Brian MacIntosh / BMacZero', 'url': 'https://opengameart.org/content/electricity-sound-effects-0', 'download': 'https://opengameart.org/sites/default/files/spark.wav', 'archive': 'spark.wav', 'license': 'CC0-1.0'},
    'crystal': {'title': 'Shimmer glitter magic', 'author': 'The Berklee College of Music; submitted by qubodup', 'url': 'https://opengameart.org/content/shimmer-glitter-magic', 'download': 'https://opengameart.org/sites/default/files/shimmer_1.flac', 'archive': 'shimmer.flac', 'license': 'CC-BY-3.0'},
    'crossbow': {'title': 'Crossbow Shot', 'author': 'LeMudCrab', 'url': 'https://freesound.org/people/LeMudCrab/sounds/163453/', 'download': 'https://cdn.freesound.org/previews/163/163453_2263027-hq.mp3', 'archive': 'crossbow-fire.mp3', 'license': 'CC0-1.0'},
    'rifle': {'title': 'Chaingun, pistol, rifle, shotgun shots', 'author': 'Michel Baradari', 'url': 'https://opengameart.org/content/chaingun-pistol-rifle-shotgun-shots', 'download': 'https://opengameart.org/sites/default/files/shots.7z', 'archive': 'shots.7z', 'license': 'CC-BY-3.0'},
}

def layer(file, seconds, gain=1, speed=1, at=0, high=35, low=11000, start=None):
    return dict(file=file, seconds=seconds, gain=gain, speed=speed, at=at, high=high, low=low, start=start)

# Double's two impulses follow the two projectile launches, 65ms apart, so one gameplay shot consumes
# exactly one sample voice and still corresponds to one arithmetic subtraction.
RECIPES = {
    'basic': ('대포의 짧은 화약 발사', .54, ['cannon'], [layer('cannon-fire.ogg', .54)]),
    'double': ('65ms 간격의 두 포신 발사', .59, ['cannon'], [layer('cannon-fire.ogg', .5, .7), layer('cannon-fire.ogg', .5, .65, at=.065)]),
    'needle': ('쇠뇌 장력이 풀리는 날카로운 발사', .24, ['crossbow'], [layer('crossbow-fire.mp3', .2, high=100)]),
    'pebble': ('작은 돌이 튀는 흙 파열', .46, ['magic'], [layer('magic-attacks/30_Earth_02.wav', .46, start=.08, high=160)]),
    'frost': ('차가운 바람과 부드러운 냉기', .66, ['magic'], [layer('magic-attacks/25_Wind_01.wav', .66, .7, low=6000), layer('magic-attacks/13_Ice_explosion_01.wav', .52, .4, low=6500)]),
    'ice': ('얼음창의 선명한 결정 파열', .82, ['magic'], [layer('magic-attacks/13_Ice_explosion_01.wav', .82)]),
    'catapult': ('목재 장력과 무거운 바위 비행', .69, ['foley', 'magic'], [layer('tinysized/sfx-cc0/floor-creak-01.wav', .25, .9), layer('magic-attacks/25_Wind_01.wav', .53, .35, at=.13, low=4000)]),
    'lightning': ('연결된 테슬라 방전과 짧은 천둥', .59, ['electric', 'spark', 'magic'], [layer('continuous-spark.wav', .19, .9), layer('continuous-spark.wav', .19, .7, at=.17), layer('spark.wav', .21, .55, at=.3), layer('magic-attacks/18_Thunder_02.wav', .57, .45, high=70, low=4500)]),
    'crystal': ('맑게 울리는 수정 마법', .72, ['crystal'], [layer('shimmer.flac', .66)]),
    'sniper': ('소총의 짧고 선명한 단발', .4, ['rifle'], [layer('shots/shots/rifle.wav', .4)]),
    'siege': ('깊은 화약 폭발과 긴 대포 잔향', .94, ['cannon'], [layer('cannon-fire.ogg', .94, speed=.95, low=6500)]),
    'rune': ('쇠뇌 발사와 룬의 충전 잔향', .84, ['crossbow', 'magic'], [layer('crossbow-fire.mp3', .2, gain=1.4), layer('magic-attacks/45_Charge_05.wav', .75, gain=.6, at=.045)]),
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
    # Retain the recorded dynamics; do not turn every small texture into a
    # full-volume layer. Only balance the finished, combined weapon sound.
    x *= recipe['gain']
    fade = min(len(x) // 4, int(.018 * RATE))
    if fade: x[-fade:] *= np.linspace(1, 0, fade)
    return x, {'file': recipe['file'], 'sourceSha256': sha(path), 'sourceBytes': path.stat().st_size, 'trimStart': round(start, 6), **{k: v for k, v in recipe.items() if k not in ('file', 'start')}}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', default='ffmpeg')
    args = parser.parse_args()
    previous_path = LICENSES / 'tower-audio-v1.json'
    previous = json.loads(previous_path.read_text(encoding='utf-8')) if previous_path.exists() else None
    if previous and previous.get('version') == 2:
        for source in previous['sources'].values():
            if sha(SOURCE / source['archive']) != source['downloadSha256']: raise ValueError('Original archive hash differs: ' + source['archive'])
        for clip in previous['towers'].values():
            for record in clip['layers']:
                if sha(SOURCE / record['file']) != record['sourceSha256']: raise ValueError('Original audio hash differs: ' + record['file'])
    DEST.mkdir(parents=True, exist_ok=True)
    cache = SOURCE / 'processed'
    cache.mkdir(exist_ok=True)
    report = {'version': 2, 'sources': SOURCES, 'licenseNotice': 'tower-audio-LICENSES.txt', 'processing': {'rate': 24000, 'channels': 1, 'codec': 'MP3', 'bitrate': 64000, 'compressor': 'none; preserve transients', 'normalization': 'finished mix, 85th percentile of active 20ms RMS windows; linear gain limited by peak', 'targetActiveRms': .15, 'targetPeak': .82, 'fadeInMs': 2, 'fadeOutMs': 60, 'metadata': 'removed', 'runtime': 'lazy loaded, decoded once, fingerprinted immutable cache'}, 'towers': {}}
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
        windows = [float(np.sqrt(np.mean(mix[i:i+960]**2))) for i in range(0, len(mix), 960)]
        active = [v for v in windows if v > max(windows) * .08]
        active_rms = float(np.percentile(active, 85))
        normalization = float(min(.15 / max(.001, active_rms), .82 / max(.001, float(np.max(np.abs(mix))))))
        mix *= normalization
        fade_in, fade_out = round(.002 * RATE), round(.06 * RATE)
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
        licenses = sorted({SOURCES[s]['license'] for s in sources} - {'CC0-1.0'}) or ['CC0-1.0']
        report['towers'][key] = {'description': description, 'sources': sources, 'licenses': licenses, 'license': ' + '.join(licenses), 'licenseUrl': LICENSE_URLS[licenses[0]], 'layers': records, 'normalizationGain': round(normalization, 6), 'filename': key + '.mp3', 'sha256': sha(output), 'bytes': output.stat().st_size, 'duration': round(info.duration, 6), 'sourceDuration': seconds, 'referenceStereoWavBytes': stereo_wav_bytes, 'decodedPeak': round(peak, 6), 'decodedRms': round(float(np.sqrt(np.mean(decoded**2))), 6)}
    for source in SOURCES.values():
        archive = SOURCE / source['archive']
        source.update({'licenseUrl': LICENSE_URLS[source['license']], 'downloadSha256': sha(archive), 'modifications': 'silence trimming, light EQ, short fades, finished-mix level balancing, mono MP3 encoding; speed=.95 only for siege'})
    report['totalBytes'] = sum(t['bytes'] for t in report['towers'].values())
    report['referenceStereoWavBytes'] = sum(t['referenceStereoWavBytes'] for t in report['towers'].values())
    report['reductionPercent'] = round(100 * (1 - report['totalBytes'] / report['referenceStereoWavBytes']), 2)
    (LICENSES / 'tower-audio-v1.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'bytes': report['totalBytes'], 'referenceStereoWavBytes': report['referenceStereoWavBytes'], 'reductionPercent': report['reductionPercent'], 'clips': {k: {'bytes': t['bytes'], 'seconds': t['duration'], 'peak': t['decodedPeak'], 'rms': t['decodedRms']} for k, t in report['towers'].items()}}, ensure_ascii=False))

if __name__ == '__main__': main()
