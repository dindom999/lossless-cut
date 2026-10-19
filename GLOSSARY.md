# GLOSSARY

Domain vocabulary for LosslessCut. Implementation details belong in the code, not here — this file records what the words *mean*, and which word to use when.

## Media file

The video or audio file the user is working on. This is the file LosslessCut reads, cuts, and exports from.

The codebase says this same thing several ways, and the overlap is a genuine source of confusion. Use these consistently:

| Term | Where it belongs |
| --- | --- |
| **media file** | User-facing text. Error messages and dialogs should say "media file". |
| **source file** | The `.llc` project file's `mediaFileName` field, and anything describing the file's relationship to its own directory (e.g. "the source file's directory"). |
| **`filePath`** | The `App.tsx` state holding the media file's absolute path. |
| **`SourceFile`** | The template-variable type in `common/userTypes.ts` — the structured view of a media file used by the file-name template evaluator. |

`mainFileMeta` is *not* a synonym for the media file itself — it is the ffprobe metadata and filesystem stats of whichever file is currently open. "Main" distinguishes it from the extra streams files a user can attach.

## Project file

A `.llc` file: a saved list of cut segments plus a reference to a media file. Two naming conventions exist and they are **not** interchangeable:

- **`<basename>-proj.llc`** — the auto-saved project file. Derived from the media file's base name via the `proj.llc` suffix. Written on a debounce whenever segments change and auto-save is enabled.
- **`<basename>.llc`** — what "Export project (LLC)" produces. The user chooses the location in a save dialog.

A project file records the media file by **base name only**, never by full path. Loading one resolves the media file as *the project file's own directory + that base name*. So a project file is only meaningful next to the media file it describes.

Consequence worth remembering: renaming a media file breaks every project file that references it, unless the project file is moved and rewritten alongside.

## Working directory

The user-configured output directory (`customOutDir`). Distinct from the media file's own directory. Project files may be saved to either, depending on the `storeProjectInWorkingDir` setting.

## Batch list

The ordered list of media files loaded for batch operations (concatenate, convert format). Independent of the single currently-open file — a file can be open *and* be a batch-list member, and the batch list outlives closing a file.