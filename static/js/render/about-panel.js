import {
  CONTENT_TOPIC_AREAS,
  CONTENT_TOPIC_REGISTRY,
  getContentTopicDefinition,
  SECTION_REGISTRY,
  getSectionDefinition,
} from '../config/sections.js';

const ABOUT_TOPIC_IDS = Object.freeze(
  CONTENT_TOPIC_REGISTRY
    .filter((topic) => topic.area === CONTENT_TOPIC_AREAS.ABOUT)
    .map((topic) => topic.id),
);

const toArray = (value) => Array.from(value ?? []);

const getDocumentRef = (root) => root?.ownerDocument ?? root ?? document;

const clearChildren = (element) => {
  while (element?.firstChild) {
    element.removeChild(element.firstChild);
  }
};

const parseTopicIds = (rawValue) =>
  typeof rawValue === 'string'
    ? rawValue.trim().split(/\s+/).filter(Boolean)
    : [];

const setAccentKey = (element, accentKey) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (accentKey) {
    element.dataset.accentKey = accentKey;
    return;
  }

  delete element.dataset.accentKey;
};

const getRelatedPagesForTopic = (topicId) =>
  SECTION_REGISTRY.filter((section) => section.aboutTopicIds.includes(topicId));

const getTopicAccentKey = (topicId) =>
  getRelatedPagesForTopic(topicId)[0]?.accentKey ?? 'control';

const extractAboutSections = (surfaceBody) => {
  const sectionsByTopicId = new Map();

  toArray(surfaceBody?.querySelectorAll('[data-topic-area="about"][data-topic-ids]')).forEach((section) => {
    parseTopicIds(section.dataset.topicIds)
      .filter((topicId) => topicId.startsWith('about.'))
      .forEach((topicId) => {
        sectionsByTopicId.set(topicId, section);
      });
  });

  return sectionsByTopicId;
};

const buildAboutShell = (surfaceBody, documentRef) => {
  clearChildren(surfaceBody);

  const shell = documentRef.createElement('div');
  const nav = documentRef.createElement('nav');
  const view = documentRef.createElement('div');

  shell.className = 'about-panel-shell';
  nav.className = 'about-topic-nav';
  nav.setAttribute('aria-label', 'Info topics');
  view.className = 'about-topic-view';

  surfaceBody.append(shell);
  shell.append(nav, view);

  return {
    shell,
    nav,
    view,
  };
};

const createSourceList = (documentRef, sourceRefs) => {
  const block = documentRef.createElement('div');
  const label = documentRef.createElement('p');
  const list = documentRef.createElement('ul');

  block.className = 'about-topic-meta-block';
  label.className = 'context-block-label';
  label.textContent = 'Source refs';
  list.className = 'context-source-list';

  sourceRefs.forEach((sourceRef) => {
    const item = documentRef.createElement('li');
    item.className = 'context-source-item';
    item.textContent = sourceRef;
    list.appendChild(item);
  });

  block.append(label, list);
  return block;
};

const createRelatedPages = (documentRef, topicId) => {
  const relatedPages = getRelatedPagesForTopic(topicId);

  if (!relatedPages.length) {
    return null;
  }

  const block = documentRef.createElement('div');
  const label = documentRef.createElement('p');
  const list = documentRef.createElement('div');

  block.className = 'about-topic-meta-block';
  label.className = 'context-block-label';
  label.textContent = 'Linked pages';
  list.className = 'about-topic-pages';

  relatedPages.forEach((section) => {
    const tag = documentRef.createElement('span');
    tag.className = 'about-topic-page';
    tag.dataset.accentKey = section.accentKey;
    tag.textContent = `${section.pageCode} ${section.title}`;
    list.appendChild(tag);
  });

  block.append(label, list);
  return block;
};

export const createAboutPanelController = ({ root = document }) => {
  const documentRef = getDocumentRef(root);
  const mount = documentRef.getElementById('aboutSurfaceMount');
  const surfaceCard = mount?.querySelector('.surface-card');
  const surfaceBody = mount?.querySelector('.surface-body');

  if (!mount || !surfaceBody) {
    return {
      sync() {},
      openTopic() {},
      openSuggestedTopicForPage() {},
      destroy() {},
    };
  }

  const sectionsByTopicId = extractAboutSections(surfaceBody);
  const aboutShell = buildAboutShell(surfaceBody, documentRef);
  const cleanup = [];

  let activeTopicId = ABOUT_TOPIC_IDS[0] ?? null;
  let suggestedTopicIds = [];
  let suggestedFromPageId = null;

  const render = () => {
    clearChildren(aboutShell.nav);
    clearChildren(aboutShell.view);

    const heading = documentRef.createElement('p');
    const list = documentRef.createElement('div');
    const topicDefinition = activeTopicId ? getContentTopicDefinition(activeTopicId) : null;
    const topicSection = activeTopicId ? sectionsByTopicId.get(activeTopicId) ?? null : null;
    const topicAccentKey = activeTopicId ? getTopicAccentKey(activeTopicId) : 'control';

    setAccentKey(surfaceCard, topicAccentKey);

    heading.className = 'workspace-title';
    heading.textContent = 'Info topics';

    list.className = 'about-topic-list';

    ABOUT_TOPIC_IDS.forEach((topicId) => {
      const definition = getContentTopicDefinition(topicId);
      const button = documentRef.createElement('button');
      const isActive = activeTopicId === topicId;
      const isSuggested = suggestedTopicIds.includes(topicId);

      button.type = 'button';
      button.className = 'about-topic-button';
      button.dataset.aboutTopicId = topicId;
      button.dataset.accentKey = getTopicAccentKey(topicId);
      button.classList.toggle('is-active', isActive);
      button.classList.toggle('is-suggested', isSuggested);
      button.textContent = definition?.title ?? topicId;

      if (isActive) {
        button.setAttribute('aria-current', 'page');
      }

      list.appendChild(button);
    });

    aboutShell.nav.append(heading, list);

    if (!topicDefinition || !topicSection) {
      return;
    }

    const meta = documentRef.createElement('section');
    meta.className = 'about-topic-meta';
    meta.dataset.accentKey = topicAccentKey;

    const activeHeading = documentRef.createElement('p');
    activeHeading.className = 'workspace-title';
    activeHeading.textContent = 'Active topic';

    const title = documentRef.createElement('h2');
    title.className = 'about-topic-title';
    title.textContent = topicDefinition.title;

    meta.append(activeHeading, title);

    if (suggestedTopicIds.includes(activeTopicId)) {
      const suggestion = documentRef.createElement('p');
      const suggestedFromPage = suggestedFromPageId
        ? getSectionDefinition(suggestedFromPageId)
        : SECTION_REGISTRY.find((section) => section.aboutTopicIds.includes(activeTopicId));
      suggestion.className = 'about-topic-suggestion';
      suggestion.textContent = suggestedFromPage
        ? `Suggested from ${suggestedFromPage.pageCode} ${suggestedFromPage.title}.`
        : 'Suggested for the current page.';
      meta.appendChild(suggestion);
    }

    if (topicDefinition.sourceRefs.length) {
      meta.appendChild(createSourceList(documentRef, topicDefinition.sourceRefs));
    }

    const relatedPages = createRelatedPages(documentRef, activeTopicId);
    if (relatedPages) {
      meta.appendChild(relatedPages);
    }

    aboutShell.view.append(meta, topicSection);
  };

  const sync = (state) => {
    const livePageDefinition = getSectionDefinition(state.ui.activePageId);
    suggestedTopicIds = [...(livePageDefinition?.aboutTopicIds ?? [])];
    suggestedFromPageId = state.ui.activePageId;

    if (!activeTopicId) {
      activeTopicId = suggestedTopicIds[0] ?? ABOUT_TOPIC_IDS[0] ?? null;
    }

    render();
  };

  const handleClick = (event) => {
    const button = event.target.closest('[data-about-topic-id]');

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    activeTopicId = button.dataset.aboutTopicId;
    render();
  };

  aboutShell.nav.addEventListener('click', handleClick);
  cleanup.push(() => {
    aboutShell.nav.removeEventListener('click', handleClick);
  });

  render();

  return {
    sync,
    openTopic(topicId) {
      if (!topicId || !ABOUT_TOPIC_IDS.includes(topicId)) {
        return;
      }

      activeTopicId = topicId;
      render();
    },
    openSuggestedTopicForPage(pageId) {
      const pageDefinition = getSectionDefinition(pageId);
      suggestedFromPageId = pageId;
      activeTopicId = pageDefinition?.aboutTopicIds[0] ?? ABOUT_TOPIC_IDS[0] ?? null;
      render();
    },
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
