/**
 * lesson controller
 * Custom controller to enforce ownership and enrollment filtering
 */

import { factories } from '@strapi/strapi';
import type { Context } from 'koa';

const defaultController = factories.createCoreController(
  'api::lesson.lesson'
);

export default {
  ...defaultController,

  /**
   * Override find to filter lessons based on user role
   */
  async find(ctx: Context) {
    const { state } = ctx as any;

    // Add course population if not already present
    if (!(ctx.query as any).populate) {
      (ctx.query as any).populate = ['course'];
    }

    // If not authenticated, only show lessons from published courses
    if (!state.user) {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        course: {
          publishedAt: { $notNull: true },
        },
      };
      return (defaultController as any).find(ctx);
    }

    // Admin and Content Manager can see all lessons
    if (
      state.user.role.name === 'Admin' ||
      state.user.role.name === 'Content Manager'
    ) {
      return (defaultController as any).find(ctx);
    }

    // Instructor can see only lessons from their own courses
    if (state.user.role.name === 'Instructor') {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        course: {
          instructor: { id: state.user.id },
        },
      };
      return (defaultController as any).find(ctx);
    }

    // Student can see only lessons from published courses they're enrolled in
    if (state.user.role.name === 'Student') {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        course: {
          publishedAt: { $notNull: true },
        },
      };
      return (defaultController as any).find(ctx);
    }

    // Default: return lessons from published courses only
    (ctx.query as any).filters = {
      ...(ctx.query as any).filters,
      course: {
        publishedAt: { $notNull: true },
      },
    };
    return (defaultController as any).find(ctx);
  },
};
