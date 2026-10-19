# 重命名媒体文件走完整的关闭/重开流程

「文件」菜单的「重命名」不采用「原地换路径」——它先把切段落盘、改名，再走`loadMedia` 重新加载文件，而不是只调`setFilePath` 和手动迁移那些以路径为 key 的 `Map`。

原因有二。Windows 在 `<video>` 元素和 compat player 的常驻 ffmpeg 子进程持有句柄时拒绝 rename（EPERM/EBUSY），而原地换路径根本不会触发这两者的清理；并且 `loadMedia` 内部的 `resetState()` 会清空 `cutSegmentsHistory`，所以切段必须在重载前先落盘，再靠 `loadMedia` 已有的 `projectPath` 参数读回来——这样复用了被测试过的加载路径，而不必去同步 `paramsByFile`、`externalFilesMeta`、`copyStreamIdsByFile` 等一整串以路径为 key 的状态。

代价是重载会重置缩略图缓存、缩放等派生状态，以及播放位置（靠新增的 `onLoadedMetadata` + `pendingSeekRef` 恢复，因为 `smoothSeek` 不处理 metadata 未就绪的情况）。这些代价小于手工同步状态出错的风险。