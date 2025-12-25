async function countTopLevelFrames() {
  const topLevelFrames = pixso.currentPage.children.filter(
    node => node.type === 'FRAME' && node.visible !== false
  );

  pixso.notify(`Видимых верхнеуровневых фреймов: ${topLevelFrames.length}`);
}

countTopLevelFrames();
