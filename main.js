async function countFramesOnCurrentPage() {
  const frames = await pixso.currentPage.findAllAsync(node => node.type === 'FRAME');
  pixso.notify(`Фреймов на странице: ${frames.length}`);
}
countFramesOnCurrentPage();
