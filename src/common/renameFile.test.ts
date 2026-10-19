// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, expect, test } from 'vitest';

import { getRenamedFileName, getRenamedProjectFileName, renameLlcProjectMediaFileName, validateNewBaseName } from './renameFile.js';

describe('getRenamedFileName', () => {
  test('replaces only the base name, keeping the extension', () => {
    expect(getRenamedFileName({ newBaseName: 'My Vacation', ext: '.mp4' })).toBe('My Vacation.mp4');
  });

  test('handles a file with no extension', () => {
    expect(getRenamedFileName({ newBaseName: 'docs', ext: '' })).toBe('docs');
  });

  test('keeps the extension exactly as it was, including case', () => {
    expect(getRenamedFileName({ newBaseName: 'clip', ext: '.MP4' })).toBe('clip.MP4');
  });
});

describe('validateNewBaseName', () => {
  const valid = { currentBaseName: 'Beach Trip', isWindows: true, isMac: false };

  test('accepts an ordinary new base name', () => {
    expect(validateNewBaseName({ ...valid, newBaseName: 'My Vacation' })).toBeUndefined();
  });

  test('accepts non-latin scripts', () => {
    expect(validateNewBaseName({ ...valid, newBaseName: '映画 2024' })).toBeUndefined();
    expect(validateNewBaseName({ ...valid, newBaseName: '😀 holiday' })).toBeUndefined();
  });

  test('rejects an empty name', () => {
    expect(validateNewBaseName({ ...valid, newBaseName: '' })).toBe('empty');
    expect(validateNewBaseName({ ...valid, newBaseName: '   ' })).toBe('empty');
  });

  test('rejects a name identical to the current one', () => {
    expect(validateNewBaseName({ ...valid, newBaseName: 'Beach Trip' })).toBe('sameAsCurrent');
  });

  test('rejects characters windows forbids', () => {
    expect(validateNewBaseName({ ...valid, newBaseName: 'a<b' })).toBe('invalidChars');
    expect(validateNewBaseName({ ...valid, newBaseName: 'a>b' })).toBe('invalidChars');
    expect(validateNewBaseName({ ...valid, newBaseName: 'a:b' })).toBe('invalidChars');
    expect(validateNewBaseName({ ...valid, newBaseName: 'a"b' })).toBe('invalidChars');
    expect(validateNewBaseName({ ...valid, newBaseName: 'a|b' })).toBe('invalidChars');
    expect(validateNewBaseName({ ...valid, newBaseName: 'a?b' })).toBe('invalidChars');
    expect(validateNewBaseName({ ...valid, newBaseName: 'a*b' })).toBe('invalidChars');
    // control characters https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
    expect(validateNewBaseName({ ...valid, newBaseName: `a${String.fromCodePoint(9)}b` })).toBe('invalidChars');
  });

  test('rejects path separators, on every platform', () => {
    // a rename must never move the file to another directory
    for (const platform of [{ isWindows: true, isMac: false }, { isWindows: false, isMac: false }, { isWindows: false, isMac: true }]) {
      expect(validateNewBaseName({ ...valid, ...platform, newBaseName: 'a/b' })).toBe('invalidChars');
      expect(validateNewBaseName({ ...valid, ...platform, newBaseName: String.raw`a\b` })).toBe('invalidChars');
    }
  });

  test('only rejects a colon on windows and mac, matching the export-name rules', () => {
    // https://github.com/mifi/lossless-cut/issues/631 and https://github.com/mifi/lossless-cut/issues/830
    expect(validateNewBaseName({ ...valid, isWindows: true, isMac: false, newBaseName: 'a:b' })).toBe('invalidChars');
    expect(validateNewBaseName({ ...valid, isWindows: false, isMac: true, newBaseName: 'a:b' })).toBe('invalidChars');
    // linux tolerates colons in file names
    expect(validateNewBaseName({ ...valid, isWindows: false, isMac: false, newBaseName: 'a:b' })).toBeUndefined();
  });

  test('rejects a trailing dot or whitespace on windows', () => {
    // https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
    expect(validateNewBaseName({ ...valid, isWindows: true, isMac: false, newBaseName: 'trip.' })).toBe('trailingDotOrWhitespace');
    expect(validateNewBaseName({ ...valid, isWindows: true, isMac: false, newBaseName: 'trip ' })).toBe('trailingDotOrWhitespace');
  });

  test('allows a trailing dot on platforms that permit it', () => {
    expect(validateNewBaseName({ ...valid, isWindows: false, isMac: false, newBaseName: 'trip.' })).toBeUndefined();
  });

  test('rejects a name too long for the file system', () => {
    expect(validateNewBaseName({ ...valid, newBaseName: 'a'.repeat(300) })).toBe('tooLong');
    expect(validateNewBaseName({ ...valid, newBaseName: 'a'.repeat(200) })).toBeUndefined();
  });

  test('rejects the directory references, on every platform', () => {
    // `.` and `..` would turn the rename into a move into the parent directory
    for (const platform of [{ isWindows: true, isMac: false }, { isWindows: false, isMac: false }, { isWindows: false, isMac: true }]) {
      expect(validateNewBaseName({ ...valid, ...platform, newBaseName: '.' })).toBe('reservedName');
      expect(validateNewBaseName({ ...valid, ...platform, newBaseName: '..' })).toBe('reservedName');
    }
  });

  test('rejects windows reserved device names', () => {
    for (const reserved of ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT9']) {
      expect(validateNewBaseName({ ...valid, isWindows: true, isMac: false, newBaseName: reserved })).toBe('reservedName');
      // windows reserves these with any extension too, so the check applies to the part before the first dot
      expect(validateNewBaseName({ ...valid, isWindows: true, isMac: false, newBaseName: `${reserved}.mp4` })).toBe('reservedName');
      expect(validateNewBaseName({ ...valid, isWindows: true, isMac: false, newBaseName: `${reserved}.archive.mkv` })).toBe('reservedName');
    }
    // ...but only that part: COM1mp4 is an ordinary file name
    expect(validateNewBaseName({ ...valid, isWindows: true, isMac: false, newBaseName: 'COM1mp4' })).toBeUndefined();
  });

  test('does not reserve those names on other platforms', () => {
    expect(validateNewBaseName({ ...valid, isWindows: false, isMac: true, newBaseName: 'CON' })).toBeUndefined();
  });
});

describe('getRenamedProjectFileName', () => {
  test('follows the media file, keeping the project suffix', () => {
    expect(getRenamedProjectFileName({ projectFileName: 'Beach Trip-proj.llc', currentBaseName: 'Beach Trip', newBaseName: 'My Vacation' })).toBe('My Vacation-proj.llc');
  });

  test('works for a project file in the working directory, whose suffix is the same', () => {
    expect(getRenamedProjectFileName({ projectFileName: 'Beach Trip-proj.llc', currentBaseName: 'Beach Trip', newBaseName: 'My Vacation' })).toBe('My Vacation-proj.llc');
  });

  test('replaces only the leading base name, not a later occurrence of the same text', () => {
    // `Beach Trip-Beach Trip.llc` is an ordinary (if odd) name; only the first part is the media base name
    expect(getRenamedProjectFileName({ projectFileName: 'Beach Trip-Beach Trip.llc', currentBaseName: 'Beach Trip', newBaseName: 'My Vacation' })).toBe('My Vacation-Beach Trip.llc');
  });

  test('leaves the name alone when it does not start with the current base name', () => {
    expect(getRenamedProjectFileName({ projectFileName: 'other.llc', currentBaseName: 'Beach Trip', newBaseName: 'My Vacation' })).toBe('other.llc');
  });
});

describe('renameLlcProjectMediaFileName', () => {
  // A project file records the media file by base name only, resolved against its own directory
  // (see GLOSSARY.md). Renaming the media file without updating this field leaves a project file
  // that can no longer be loaded, so the rename has to rewrite it.
  const project = { version: 2, mediaFileName: 'Beach Trip.mp4', cutSegments: [{ start: 0, end: 10, name: 'a' }] };

  test('updates mediaFileName to the new media file name', () => {
    expect(renameLlcProjectMediaFileName(project, 'My Vacation.mp4')).toEqual({ ...project, mediaFileName: 'My Vacation.mp4' });
  });

  test('leaves the cut segments untouched', () => {
    expect(renameLlcProjectMediaFileName(project, 'My Vacation.mp4').cutSegments).toEqual(project.cutSegments);
  });

  test('drops mediaFileName when the project has none, rather than inventing one', () => {
    const withoutMedia: { mediaFileName?: string } = { ...project };
    delete withoutMedia.mediaFileName;
    expect(renameLlcProjectMediaFileName(withoutMedia, 'My Vacation.mp4')).toEqual(withoutMedia);
  });
});
