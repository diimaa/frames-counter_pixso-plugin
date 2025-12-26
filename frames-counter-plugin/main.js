pixso.showUI(__html__, { width: 360, height: 320 });

const messageTypes = {
  recountRequest: 'request-recount',
  framesCounted: 'frames-counted',
  groupStatsRequest: 'request-group-stats',
  groupStatsReady: 'group-stats-ready'
};

const isVisible = node => node?.visible !== false;

function isInsideHiddenContainer(node) {
  let parent = node?.parent;
  while (parent) {
    if ((parent.type === 'SECTION' || parent.type === 'GROUP') && !isVisible(parent)) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function countFramesInsideSection(section) {
  if (!isVisible(section) || !section?.children) {
    return 0;
  }

  let total = 0;

  for (const child of section.children) {
    if (!isVisible(child)) {
      continue;
    }

    if (child.type === 'FRAME') {
      if (!isInsideHiddenContainer(child)) {
        total += 1;
      }
      continue;
    }

    if (child.type === 'SECTION') {
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
    if (!isVisible(page)) {
      continue;
    }

    pagesScanned += 1;
    const children = page.children ?? [];

    for (const child of children) {
      if (!isVisible(child)) {
        continue;
      }

      if (child.type === 'FRAME') {
        if (!isInsideHiddenContainer(child)) {
          visibleFrameCount += 1;
        }
        continue;
      }

      if (child.type === 'SECTION') {
        visibleFrameCount += countFramesInsideSection(child);
      }
    }
  }

  return { count: visibleFrameCount, pagesScanned };
}

function collectGroupStats() {
  const pages = pixso.root?.children?.filter(node => node.type === 'PAGE') ?? [];
  const groups = [];

  for (const page of pages) {
    if (!isVisible(page)) {
      continue;
    }

    const children = page.children ?? [];

    for (const child of children) {
      if (!isVisible(child) || child.type !== 'GROUP' || !child.children) {
        continue;
      }

      let frameCount = 0;

      for (const groupChild of child.children) {
        if (
          groupChild.type === 'FRAME' &&
          isVisible(groupChild) &&
          !isInsideHiddenContainer(groupChild)
        ) {
          frameCount += 1;
        }
      }

      groups.push({
        id: child.id,
        name: child.name?.trim() || 'Группа без имени',
        frameCount
      });
    }
  }

  return groups;
}

function postFrameStats(payload) {
  pixso.ui.postMessage({
    type: messageTypes.framesCounted,
    ...payload
  });
}

function postGroupStats(groups, error) {
  pixso.ui.postMessage({
    type: messageTypes.groupStatsReady,
    groups,
    error,
    updatedAt: new Date().toISOString()
  });
}

function runFrameAudit() {
  try {
    const { count, pagesScanned } = countVisibleTopLevelFrames();
    postFrameStats({
      count,
      pagesScanned,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    postFrameStats({
      count: 0,
      pagesScanned: 0,
      error: error?.message || String(error)
    });
  }
}

function runGroupAudit() {
  try {
    const groups = collectGroupStats();
    postGroupStats(groups, null);
  } catch (error) {
    postGroupStats([], error?.message || String(error));
  }
}

pixso.ui.onmessage = message => {
  if (!message?.type) {
    return;
  }

  if (message.type === messageTypes.recountRequest) {
    runFrameAudit();
    return;
  }

  if (message.type === messageTypes.groupStatsRequest) {
    runGroupAudit();
  }
};

runFrameAudit();
runGroupAudit();