/**
 * quiz-result router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::quiz-result.quiz-result', {
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  config: {
    findOne: {
      policies: [
        'api::quiz-result.quizResultOwner',
      ],
    },
    update: {
      policies: [
        'api::quiz-result.quizResultOwner',
      ],
    },
    delete: {
      policies: [
        'api::quiz-result.quizResultOwner',
      ],
    },
  },
});
