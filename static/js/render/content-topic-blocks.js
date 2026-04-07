import { clearChildren, createSourceList } from '../utils/shared.js';

const appendParagraph = (documentRef, parent, text) => {
  const paragraph = documentRef.createElement('p');
  paragraph.textContent = text;
  parent.appendChild(paragraph);
};

const appendList = (documentRef, parent, items, { ordered = false } = {}) => {
  const list = documentRef.createElement(ordered ? 'ol' : 'ul');
  items.forEach((itemText) => {
    const item = documentRef.createElement('li');
    item.textContent = itemText;
    list.appendChild(item);
  });
  parent.appendChild(list);
};

const createChip = (documentRef, chipDefinition) => {
  const chip = documentRef.createElement('span');
  chip.className = 'chip';
  chip.textContent = chipDefinition.label;

  Object.entries(chipDefinition.dataset ?? {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      chip.dataset[key] = value;
    }
  });

  return chip;
};

const appendCards = (documentRef, parent, cards) => {
  const grid = documentRef.createElement('div');
  grid.className = 'reference-cards';

  cards.forEach((cardDefinition) => {
    const card = documentRef.createElement('section');
    const heading = documentRef.createElement('h3');

    card.className = 'mini-card';
    heading.textContent = cardDefinition.title;
    card.appendChild(heading);

    (cardDefinition.paragraphs ?? []).forEach((paragraph) => {
      appendParagraph(documentRef, card, paragraph);
    });

    if (Array.isArray(cardDefinition.items) && cardDefinition.items.length) {
      appendList(documentRef, card, cardDefinition.items, {
        ordered: Boolean(cardDefinition.ordered),
      });
    }

    grid.appendChild(card);
  });

  parent.appendChild(grid);
};

const appendTable = (documentRef, parent, block) => {
  const card = documentRef.createElement('section');
  const heading = documentRef.createElement('h3');
  const table = documentRef.createElement('table');
  const thead = documentRef.createElement('thead');
  const headerRow = documentRef.createElement('tr');
  const tbody = documentRef.createElement('tbody');

  card.className = 'mini-card';
  heading.textContent = block.title;
  table.className = 'score-table';

  block.columns.forEach((column) => {
    const cell = documentRef.createElement('th');
    cell.scope = 'col';
    cell.textContent = column;
    headerRow.appendChild(cell);
  });

  thead.appendChild(headerRow);

  block.rows.forEach((rowDefinition) => {
    const row = documentRef.createElement('tr');
    rowDefinition.forEach((value, index) => {
      const cell = documentRef.createElement('td');
      if (index === 0) {
        const strong = documentRef.createElement('strong');
        strong.textContent = value;
        cell.appendChild(strong);
      } else {
        cell.textContent = value;
      }
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });

  table.append(thead, tbody);
  card.append(heading, table);
  parent.appendChild(card);
};

const appendChips = (documentRef, parent, block) => {
  const card = documentRef.createElement('section');
  const heading = documentRef.createElement('h3');
  const chipRow = documentRef.createElement('div');

  card.className = 'mini-card';
  heading.textContent = block.title;
  chipRow.className = 'chips';

  (block.chips ?? []).forEach((chipDefinition) => {
    chipRow.appendChild(createChip(documentRef, chipDefinition));
  });

  card.append(heading, chipRow);

  if (block.description) {
    appendParagraph(documentRef, card, block.description);
  }

  parent.appendChild(card);
};

const appendNotice = (documentRef, parent, block) => {
  const notice = documentRef.createElement('div');
  notice.className = `notice ${block.tone ?? 'info'}`.trim();
  notice.textContent = block.text;
  parent.appendChild(notice);
};

const appendPrinciples = (documentRef, parent, block) => {
  const list = documentRef.createElement('div');
  list.className = 'principle-list';

  block.items.forEach((itemDefinition) => {
    const item = documentRef.createElement('div');
    const strong = documentRef.createElement('strong');

    item.className = 'principle-item';
    item.dataset.section = itemDefinition.accentKey ?? 'control';
    strong.textContent = itemDefinition.title;
    item.append(strong, documentRef.createTextNode(` ${itemDefinition.description}`));
    list.appendChild(item);
  });

  parent.appendChild(list);
};

const appendBlockTitle = (documentRef, parent, title) => {
  if (!title) {
    return;
  }

  const heading = documentRef.createElement('h3');
  heading.textContent = title;
  parent.appendChild(heading);
};

export const appendStructuredTopicBlocks = (documentRef, parent, topic) => {
  (topic.blocks ?? []).forEach((block) => {
    switch (block.type) {
      case 'paragraph':
        appendParagraph(documentRef, parent, block.text);
        break;
      case 'list':
        if (block.title) {
          const section = documentRef.createElement('section');
          section.className = 'mini-card';
          appendBlockTitle(documentRef, section, block.title);
          appendList(documentRef, section, block.items ?? []);
          parent.appendChild(section);
        } else {
          appendList(documentRef, parent, block.items ?? []);
        }
        break;
      case 'ordered-list':
        appendList(documentRef, parent, block.items ?? [], { ordered: true });
        break;
      case 'table':
        appendTable(documentRef, parent, block);
        break;
      case 'chips':
        appendChips(documentRef, parent, block);
        break;
      case 'cards':
        appendCards(documentRef, parent, block.cards ?? []);
        break;
      case 'notice':
        appendNotice(documentRef, parent, block);
        break;
      case 'principles':
        appendPrinciples(documentRef, parent, block);
        break;
      default:
        break;
    }
  });
};

export const buildGuidanceTopicSection = (
  documentRef,
  topic,
  { accentKey = 'control', sectionClassName = 'doc-section context-generated-section' } = {},
) => {
  const section = documentRef.createElement('section');
  const kicker = documentRef.createElement('div');
  const heading = documentRef.createElement('h2');

  section.className = sectionClassName;
  section.dataset.section = accentKey;

  kicker.className = 'section-kicker';
  kicker.textContent = topic.kicker ?? 'Page guidance';

  heading.textContent = topic.title;

  section.append(kicker, heading);

  if (topic.summary) {
    appendParagraph(documentRef, section, topic.summary);
  }

  if (Array.isArray(topic.bullets) && topic.bullets.length) {
    appendList(documentRef, section, topic.bullets);
  }

  if (Array.isArray(topic.paragraphs) && topic.paragraphs.length) {
    topic.paragraphs.forEach((paragraph) => appendParagraph(documentRef, section, paragraph));
  }

  appendStructuredTopicBlocks(documentRef, section, topic);

  if (Array.isArray(topic.sourceRefs) && topic.sourceRefs.length) {
    section.appendChild(createSourceList(documentRef, topic.sourceRefs));
  }

  return section;
};

export const buildTopicArticle = (
  documentRef,
  topic,
  {
    accentKey = 'control',
    className = 'dashboard-section',
    headingLevel = 'h2',
    showSourceList = true,
    introKicker = null,
  } = {},
) => {
  const section = documentRef.createElement('section');
  const heading = documentRef.createElement(headingLevel);

  section.className = className;
  section.dataset.accentKey = accentKey;

  if (introKicker) {
    const kicker = documentRef.createElement('p');
    kicker.className = 'dashboard-kicker';
    kicker.textContent = introKicker;
    section.appendChild(kicker);
  }

  heading.textContent = topic.title;
  section.appendChild(heading);

  if (topic.summary) {
    appendParagraph(documentRef, section, topic.summary);
  }

  if (Array.isArray(topic.paragraphs) && topic.paragraphs.length) {
    topic.paragraphs.forEach((paragraph) => appendParagraph(documentRef, section, paragraph));
  }

  if (Array.isArray(topic.bullets) && topic.bullets.length) {
    appendList(documentRef, section, topic.bullets);
  }

  appendStructuredTopicBlocks(documentRef, section, topic);

  if (showSourceList && Array.isArray(topic.sourceRefs) && topic.sourceRefs.length) {
    section.appendChild(createSourceList(documentRef, topic.sourceRefs));
  }

  return section;
};

export const replaceMountWithTopicArticle = (mount, documentRef, topic, options = {}) => {
  clearChildren(mount);
  mount.appendChild(buildTopicArticle(documentRef, topic, options));
};
