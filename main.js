pixso.showUI(__html__, { width: 360, height: 320 });

const messageTypes = {
  recountRequest: 'request-recount',
  framesCounted: 'frames-counted'
};

const isVisible = node => node?.visible !== false;

function countFramesInsideSection(section) {
  if (!section?.children) return 0;

  let total = 0;

  for (const child of section.children) {
    if (!isVisible(child)) continue;

    if (child.type === 'FRAME') {
      total += 1;
    } else if (child.type === 'SECTION') {
      total += countFramesInsideSection(child);
    }
  }

  return total;
}

function countVisibleTopLevelFrames() {
  const pages = pixso.root?.children?.filter(node => node.type === 'PAGE') ?? [];
  let visibleFrameCount = 0;
  let pagesScanned = 0;

  for (const page of pages) {
    if (!isVisible(page)) continue;
    pagesScanned += 1;

    const children = page.children ?? [];

    for (const child of children) {
      if (!isVisible(child)) continue;

      if (child.type === 'FRAME') {
        visibleFrameCount += 1;
      } else if (child.type === 'SECTION') {
        visibleFrameCount += countFramesInsideSection(child);
      }
    }
  }

  return { count: visibleFrameCount, pagesScanned };
}

function postResultToUI(payload) {
  pixso.ui.postMessage({
    type: messageTypes.framesCounted,
    ...payload
  });
}

function runFrameAudit() {
  try {
    const { count, pagesScanned } = countVisibleTopLevelFrames();
    postResultToUI({
      count,
      pagesScanned,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    postResultToUI({
      count: 0,
      pagesScanned: 0,
      error: error?.message || String(error)
    });
  }
}

pixso.ui.onmessage = message => {
  if (message?.type === messageTypes.recountRequest) {
    runFrameAudit();
  }
};

runFrameAudit();