/**
 * enrollment router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::enrollment.enrollment', {
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  config: {
    findOne: {
      policies: [
        'api::enrollment.enrollmentOwner',
      ],
    },
    update: {
      policies: [
        'api::enrollment.enrollmentOwner',
      ],
    },
    delete: {
      policies: [
        'api::enrollment.enrollmentOwner',
      ],
    },
  },
});
