/**
 * course controller
 * Custom controller to enforce ownership filtering
 */

import { factories } from '@strapi/strapi';
import type { Context } from 'koa';

const defaultController = factories.createCoreController(
  'api::course.course'
);

export default {
  ...defaultController,

  /**
   * Override find to filter courses based on user role and ownership
   */
  async find(ctx: Context) {
    const { state } = ctx as any;

    // If not authenticated, only show published courses
    if (!state.user) {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        publishedAt: { $notNull: true },
      };
      return (defaultController as any).find(ctx);
    }

    // Admin and Content Manager can see all courses
    if (
      state.user.role.name === 'Admin' ||
      state.user.role.name === 'Content Manager'
    ) {
      return (defaultController as any).find(ctx);
    }

    // Instructor can see only their own courses
    if (state.user.role.name === 'Instructor') {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        instructor: { id: state.user.id },
      };
      return (defaultController as any).find(ctx);
    }

    // Student can see only published courses
    if (state.user.role.name === 'Student') {
      (ctx.query as any).filters = {
        ...(ctx.query as any).filters,
        publishedAt: { $notNull: true },
      };
      return (defaultController as any).find(ctx);
    }

    // Default: return published only
    (ctx.query as any).filters = {
      ...(ctx.query as any).filters,
      publishedAt: { $notNull: true },
    };
    return (defaultController as any).find(ctx);
  },

  /**
   * Override findOne to apply the same filtering rules
   */
  async findOne(ctx: Context) {
    const { state } = ctx as any;
    const { id } = (ctx.params as any);

    const course = await (strapi as any).query('api::course.course').findOne({
      where: { id },
      populate: ['instructor'],
    });

    if (!course) {
      return ctx.notFound('Course not found');
    }

    // If not authenticated, only allow access to published courses
    if (!state.user) {
      if (!course.publishedAt) {
        return ctx.forbidden('This course is not published yet');
      }
      ctx.body = course;
      return;
    }

    // Admin, Content Manager, and Instructor (if they own it) can access
    if (
      state.user.role.name === 'Admin' ||
      state.user.role.name === 'Content Manager'
    ) {
      ctx.body = course;
      return;
    }

    if (
      state.user.role.name === 'Instructor' &&
      course.instructor.id === state.user.id
    ) {
      ctx.body = course;
      return;
    }

    // Student can only access published courses
    if (state.user.role.name === 'Student') {
      if (!course.publishedAt) {
        return ctx.forbidden('This course is not published yet');
      }
      ctx.body = course;
      return;
    }

    // Default: forbidden
    return ctx.forbidden('Access denied');
  },
};
