function collectVisibleFramesFromSection(section) {
  const directFrames = section.children.filter(
    node => node.type === 'FRAME' && node.visible !== false
  );

  const nestedSectionFrames = section.children
    .filter(node => node.type === 'SECTION' && node.visible !== false)
    .flatMap(nestedSection => collectVisibleFramesFromSection(nestedSection));

  return [...directFrames, ...nestedSectionFrames];
}

function countVisibleTopLevelFramesInFile() {
  const pages = pixso.root.children.filter(
    node => node.type === 'PAGE' && node.visible !== false
  );

  const visibleFrames = pages.flatMap(page => {
    const pageFrames = page.children.filter(
      node => node.type === 'FRAME' && node.visible !== false
    );

    const sectionFrames = page.children
      .filter(node => node.type === 'SECTION' && node.visible !== false)
      .flatMap(section => collectVisibleFramesFromSection(section));

    return [...pageFrames, ...sectionFrames];
  });

  pixso.notify(`Видимых фреймов во всём файле: ${visibleFrames.length}`);
}

countVisibleTopLevelFramesInFile();
