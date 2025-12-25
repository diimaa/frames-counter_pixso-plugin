function countVisibleTopLevelFramesInFile() {
  const pages = pixso.root.children.filter(node => node.type === 'PAGE');

  const visibleTopLevelFrames = pages.flatMap(page =>
    page.children.filter(child => child.type === 'FRAME' && child.visible !== false)
  );

  pixso.notify(`Видимых фреймов во всём файле: ${visibleTopLevelFrames.length}`);
}

countVisibleTopLevelFramesInFile();
