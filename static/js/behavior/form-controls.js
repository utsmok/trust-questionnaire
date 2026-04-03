import { SECTION_IDS } from '../config/sections.js';
import { CRITERION_FIELD_IDS } from '../config/questionnaire-schema.js';
import {
  selectCriterionScore,
  selectPrincipleCompletion,
} from '../state/store.js';

const SCORE_DEFINITIONS = Object.freeze([
  '0 — Fails: The criterion is not met, or there is no evidence that it is met.',
  '1 — Partial / unclear: Some evidence exists but it remains incomplete or insufficient.',
  '2 — Meets baseline: The criterion is met to a satisfactory standard, supported by evidence.',
  '3 — Strong: The criterion is met to a high standard, with clear and compelling evidence.',
]);

const PRINCIPLE_SECTION_IDS = Object.freeze([
  SECTION_IDS.TR,
  SECTION_IDS.RE,
  SECTION_IDS.UC,
  SECTION_IDS.SE,
  SECTION_IDS.TC,
]);

const syncCheckboxItem = (item) => {
  const input = item.querySelector('input[type="checkbox"]');
  item.classList.toggle('has-checked', Boolean(input?.checked));
};

const syncRatingOption = (option, selectedScore, optionScore) => {
  const isSelected = selectedScore === optionScore;

  option.classList.toggle('selected', isSelected);
  option.classList.toggle('score-0', isSelected && optionScore === 0);
  option.classList.toggle('score-1', isSelected && optionScore === 1);
  option.classList.toggle('score-2', isSelected && optionScore === 2);
  option.classList.toggle('score-3', isSelected && optionScore === 3);
  option.setAttribute('aria-checked', String(isSelected));
};

export const initializeFormControls = ({ root = document, store }) => {
  const cleanup = [];
  const criterionCards = Array.from(root.querySelectorAll('.criterion-card[data-criterion]'));
  const ratingGroups = criterionCards.flatMap((card) => {
    const criterionCode = card.dataset.criterion;
    const scoreFieldId = CRITERION_FIELD_IDS[criterionCode]?.score;
    const scale = card.querySelector('.rating-scale');
    const label = card.querySelector('h3');

    if (!criterionCode || !scoreFieldId || !scale) {
      return [];
    }

    const options = Array.from(scale.querySelectorAll('.rating-option'));

    scale.setAttribute('role', 'radiogroup');

    if (label) {
      label.id = label.id || `criterion-label-${criterionCode.toLowerCase()}`;
      scale.setAttribute('aria-labelledby', label.id);
    }

    options.forEach((option, index) => {
      option.dataset.score = String(index);
      option.setAttribute('tabindex', '0');
      option.setAttribute('role', 'radio');
      option.setAttribute('aria-checked', 'false');
      option.setAttribute('aria-label', SCORE_DEFINITIONS[index]);
      option.setAttribute('title', SCORE_DEFINITIONS[index]);

      const handleClick = () => {
        store.actions.setCriterionScore(criterionCode, index);
      };

      option.addEventListener('click', handleClick);
      cleanup.push(() => {
        option.removeEventListener('click', handleClick);
      });
    });

    return [{ criterionCode, options }];
  });

  const checkboxBlocks = Array.from(root.querySelectorAll('.checkbox-block'));
  checkboxBlocks.forEach((block) => {
    const handleChange = (event) => {
      const checkbox = event.target;

      if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== 'checkbox') {
        return;
      }

      const item = checkbox.closest('.checkbox-item');
      if (item) {
        syncCheckboxItem(item);
      }
    };

    block.addEventListener('change', handleChange);
    cleanup.push(() => {
      block.removeEventListener('change', handleChange);
    });

    block.querySelectorAll('.checkbox-item').forEach(syncCheckboxItem);
  });

  const completionBadges = new Map();
  const stripCells = new Map();

  PRINCIPLE_SECTION_IDS.forEach((sectionId) => {
    const section = root.querySelector(`[data-page-id="${sectionId}"]`);
    const heading = section?.querySelector('h2');
    const principleKey = sectionId.toLowerCase();
    const stripCell = root.querySelector(`.strip-cell.${principleKey}`);

    if (stripCell) {
      stripCells.set(sectionId, stripCell);
    }

    if (!heading) {
      return;
    }

    let badge = heading.querySelector('.completion-badge');

    if (!badge) {
      badge = document.createElement('span');
      badge.className = `completion-badge ${principleKey}`;
      heading.appendChild(badge);
    }

    completionBadges.set(sectionId, badge);
  });

  const syncFromState = (state) => {
    ratingGroups.forEach(({ criterionCode, options }) => {
      const selectedScore = selectCriterionScore(state, criterionCode);

      options.forEach((option, index) => {
        syncRatingOption(option, selectedScore, index);
      });
    });

    PRINCIPLE_SECTION_IDS.forEach((sectionId) => {
      const badge = completionBadges.get(sectionId);
      const stripCell = stripCells.get(sectionId);
      const completion = selectPrincipleCompletion(state, sectionId);

      if (badge) {
        badge.textContent = `${completion.scoredCount}/${completion.totalCount} scored`;
        badge.classList.toggle('complete', completion.isComplete);
      }

      if (stripCell) {
        stripCell.classList.toggle('filled', completion.isComplete);
      }
    });
  };

  const unsubscribe = store.subscribe((state) => {
    syncFromState(state);
  }, { immediate: true });
  cleanup.push(unsubscribe);

  return {
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
