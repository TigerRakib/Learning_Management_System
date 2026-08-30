/**
 * lesson router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::lesson.lesson', {
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  config: {
    create: {
      policies: [
        'api::lesson.lessonOwner',
      ],
    },
    update: {
      policies: [
        'api::lesson.lessonOwner',
      ],
    },
    delete: {
      policies: [
        'api::lesson.lessonOwner',
      ],
    },
  },
});
