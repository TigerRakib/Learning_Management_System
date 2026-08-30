/**
 * course router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::course.course', {
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  config: {
    update: {
      policies: [
        'api::course.courseOwner',
      ],
    },
    delete: {
      policies: [
        'api::course.courseOwner',
      ],
    },
  },
});
