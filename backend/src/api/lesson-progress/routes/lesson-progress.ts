/**
 * lesson-progress router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::lesson-progress.lesson-progress', {
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  config: {
    findOne: {
      policies: [
        'api::lesson-progress.progressOwner',
      ],
    },
    update: {
      policies: [
        'api::lesson-progress.progressOwner',
      ],
    },
    delete: {
      policies: [
        'api::lesson-progress.progressOwner',
      ],
    },
  },
});
