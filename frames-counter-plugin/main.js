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

function hasFrameAncestor(node) {
  let parent = node?.parent;
  while (parent) {
    if (parent.type === 'FRAME') {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}

function isTopLevelFrame(frame) {
  if (!frame || frame.type !== 'FRAME') {
    return false;
  }
  return !hasFrameAncestor(frame);
}

function shouldCountFrame(frame) {
  return (
    frame.type === 'FRAME' &&
    isVisible(frame) &&
    !isInsideHiddenContainer(frame) &&
    isTopLevelFrame(frame)
  );
}

function countTopLevelFramesWithin(node) {
  if (!node?.children) {
    return 0;
  }

  let total = 0;

  for (const child of node.children) {
    if (!isVisible(child)) {
      continue;
    }

    if (shouldCountFrame(child)) {
      total += 1;
    }

    if (child.type === 'SECTION' || child.type === 'GROUP') {
      total += countTopLevelFramesWithin(child);
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
    visibleFrameCount += countTopLevelFramesWithin(page);
  }

  return { count: visibleFrameCount, pagesScanned };
}

function countDirectFramesInGroup(group) {
  const children = group.children ?? [];
  let total = 0;

  for (const child of children) {
    if (shouldCountFrame(child)) {
      total += 1;
    }
  }

  return total;
}

function collectGroupsRecursive(node, target) {
  if (!node?.children) {
    return;
  }

  for (const child of node.children) {
    if (!isVisible(child)) {
      continue;
    }

    if (child.type === 'GROUP') {
      target.push({
        id: child.id,
        name: child.name?.trim() || 'Группа без имени',
        frameCount: countDirectFramesInGroup(child)
      });
      collectGroupsRecursive(child, target);
      continue;
    }

    if (child.type === 'SECTION') {
      collectGroupsRecursive(child, target);
    }
  }
}

function collectGroupStats() {
  const pages = pixso.root?.children?.filter(node => node.type === 'PAGE') ?? [];
  const groups = [];

  for (const page of pages) {
    if (!isVisible(page)) {
      continue;
    }
    collectGroupsRecursive(page, groups);
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