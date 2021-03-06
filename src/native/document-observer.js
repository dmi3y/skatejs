import '../fix/ie/innerhtml';
import findElementInRegistry from '../util/find-element-in-registry';
import getClosestIgnoredElement from '../util/get-closest-ignored-element';
import init from '../api/init';
import walkTree from '../util/walk-tree';

function removeNode (node) {
  walkTree(node, function (node) {
    const component = findElementInRegistry(node);

    if (component && component.prototype.detachedCallback) {
      component.prototype.detachedCallback.call(node);
    }
  });
}

function documentObserverHandler (mutations) {
  const mutationsLength = mutations.length;
  for (let a = 0; a < mutationsLength; a++) {
    const addedNodes = mutations[a].addedNodes;
    const removedNodes = mutations[a].removedNodes;

    // Since siblings are batched together, we check the first node's parent
    // node to see if it is ignored. If it is then we don't process any added
    // nodes. This prevents having to check every node.
    if (addedNodes && addedNodes.length && !getClosestIgnoredElement(addedNodes[0].parentNode)) {
      const nodesLen = addedNodes.length;
      for (let a = 0; a < nodesLen; a++) {
        init(addedNodes[a], { checkIfIsInDom: false });
      }
    }

    // We can't check batched nodes here because they won't have a parent node.
    if (removedNodes && removedNodes.length) {
      const nodesLen = removedNodes.length;
      for (let a = 0; a < nodesLen; a++) {
        removeNode(removedNodes[a]);
      }
    }
  }
}

function createMutationObserver () {
  const { MutationObserver } = window;
  if (!MutationObserver) {
    throw new Error('Mutation Observers are not supported by this browser. Skate requires them in order to polyfill the behaviour of Custom Elements. If you want to support this browser you should include a Mutation Observer polyfill before Skate.');
  }
  return new MutationObserver(documentObserverHandler);
}

function createDocumentObserver () {
  const observer = createMutationObserver();
  observer.observe(document, {
    childList: true,
    subtree: true
  });
  return observer;
}

export default {
  observer: undefined,
  register: function () {
    if (!this.observer) {
      this.observer = createDocumentObserver();
    }
    return this;
  },
  unregister: function () {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
    return this;
  }
};
