/**
 * Renaming a media file is not a single `fs.rename`: the file's name is referenced from several places
 * (the app's own state, the project file's `mediaFileName`, the output file name template), and Windows
 * locks the file while it is playing. The pure parts of that problem live here so they can be tested
 * without touching the file system or the platform's path module — `src/common` is also compiled for
 * the renderer, which has no Node types. See `GLOSSARY.md` for what "media file" and "project file" mean.
 */

/** The result of validating a proposed new base name (the file name without its extension). */
export type NewBaseNameProblem =
  | 'empty'
  | 'sameAsCurrent'
  | 'invalidChars'
  | 'trailingDotOrWhitespace'
  | 'tooLong'
  | 'reservedName';

// Windows refuses these regardless of extension, case-insensitively.
// https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file#naming-conventions
const windowsReservedNames = new Set(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']);

// Characters that cannot appear in a base name on any platform, because a rename must not move the file
// to a different directory (and on Windows they are separators anyway).
const pathSeparators = ['/', '\\'];

function getInvalidChars({ isWindows, isMac }: { isWindows: boolean, isMac: boolean }) {
  const invalidChars = new Set<string>(pathSeparators);

  if (isWindows) {
    // https://stackoverflow.com/questions/1976007/what-characters-are-forbidden-in-windows-and-linux-directory-names
    ['<', '>', ':', '"', '|', '?', '*'].forEach((char) => invalidChars.add(char));
    // control characters
    for (let code = 0; code < 32; code += 1) invalidChars.add(String.fromCodePoint(code));
  } else if (isMac) {
    // A colon is invalid on Windows and macOS, but not on Linux
    // https://github.com/mifi/lossless-cut/issues/631 https://github.com/mifi/lossless-cut/issues/830
    invalidChars.add(':');
  }

  return invalidChars;
}

const isWindowsReservedName = (name: string) => {
  // Windows reserves these with any extension too, so only the part before the first dot counts
  const stem = name.split('.')[0]!.toUpperCase();
  return windowsReservedNames.has(stem);
};

/**
 * Why `newBaseName` cannot be used as the media file's new base name, or `undefined` if it is fine.
 * The extension is not part of the input and is never validated: a rename cannot change it.
 */
export function validateNewBaseName({ newBaseName, currentBaseName, isWindows, isMac, maxLength = 250 }: {
  newBaseName: string,
  currentBaseName: string,
  isWindows: boolean,
  isMac: boolean,
  maxLength?: number,
}): NewBaseNameProblem | undefined {
  if (newBaseName.trim() === '') return 'empty';
  if (newBaseName === currentBaseName) return 'sameAsCurrent';

  const invalidChars = getInvalidChars({ isWindows, isMac });
  if ([...newBaseName].some((char) => invalidChars.has(char))) return 'invalidChars';

  // File names cannot end in a space or dot on windows
  if (isWindows && /[\s.]$/.test(newBaseName)) return 'trailingDotOrWhitespace';

  if (newBaseName.length > maxLength) return 'tooLong';

  if (isWindows && isWindowsReservedName(newBaseName)) return 'reservedName';

  return undefined;
}

/** The media file's file name after renaming: the new base name with the original extension kept. */
export const getRenamedFileName = ({ newBaseName, ext }: { newBaseName: string, ext: string }) => `${newBaseName}${ext}`;

/**
 * The auto-saved project file's file name for a media file with this base name. A project file is named
 * after the media file it describes, so renaming the media file means the project file has to move too,
 * or it is left behind describing a file that no longer exists. See `GLOSSARY.md` under "Project file".
 */
export const getProjectFileName = ({ baseName, projectSuffix = 'proj.llc' }: { baseName: string, projectSuffix?: string }) => `${baseName}-${projectSuffix}`;

/**
 * The project file's file name after its media file is renamed, e.g. `Beach Trip-proj.llc` becomes
 * `My Vacation-proj.llc`. Derived from the current name so that a project file stored in the working
 * directory keeps its suffix while following the media file.
 */
export function getRenamedProjectFileName({ projectFileName, currentBaseName, newBaseName }: {
  projectFileName: string,
  currentBaseName: string,
  newBaseName: string,
}) {
  // A base name may itself contain the separator, so replace only the leading occurrence
  if (!projectFileName.startsWith(`${currentBaseName}-`)) return projectFileName;
  return `${newBaseName}${projectFileName.slice(currentBaseName.length)}`;
}

/**
 * A project file records the media file by base name only, so renaming the media file has to rewrite
 * that field — otherwise the project file is left describing a media file that no longer exists and
 * fails to load. The segments are carried over untouched.
 */
export function renameLlcProjectMediaFileName<T extends { mediaFileName?: string | undefined }>(project: T, newMediaFileName: string) {
  // A project without `mediaFileName` (legal in the schema) has nothing to update, and inventing the
  // field would change what the project file means.
  if (project.mediaFileName == null) return project;
  return { ...project, mediaFileName: newMediaFileName };
}
