"use strict";

const { Router } = require(`express`);
const { HttpCode } = require(`../../../constants`);

const authenticateJwt = require(`../../middlewares/authenticate-jwt`);
const isUserAdmin = require(`../../middlewares/is-user-admin`);

const routeParameterValidator = require(`../../middlewares/route-parameter-validator`);
const routeParameterSchema = require(`../../schemas/route-parameter`);

const articleExists = require(`../../middlewares/article-exists`);

const commentValidator = require(`../../middlewares/comment-validator`);
const commentSchema = require(`../../schemas/comment`);

module.exports = ({ app, articleService, commentService, logger } = {}) => {
  const route = new Router({ mergeParams: true });

  const isRouteParameterValid = routeParameterValidator(
    routeParameterSchema,
    logger
  );

  const isArticleExists = articleExists(articleService, logger);

  const isCommentValid = commentValidator(commentSchema, logger);

  app.use(`/`, route);

  route.get(`/comments`, async (req, res) => {
    const { limit = null, offset = null } = req.query;

    const result =
      limit || offset
        ? await commentService.findPage({ limit, offset })
        : await commentService.findAll();

    return res.status(HttpCode.OK).json(result);
  });

  route.get(`/comments/last`, async (req, res) => {
    const { limit } = req.query;
    const comments = await commentService.findAllLast(limit);

    return res.status(HttpCode.OK).json(comments);
  });

  route.get(
    `/articles/:articleId/comments`,
    [isRouteParameterValid, isArticleExists],
    async (req, res) => {
      const { article } = res.locals;
      const comments = await commentService.findAllByArticle(article.id);
      return res.status(HttpCode.OK).json(comments);
    }
  );

  route.post(
    `/articles/:articleId/comments`,
    [authenticateJwt, isArticleExists, isCommentValid],
    async (req, res) => {
      const { io } = req.app.locals;
      const { user, article } = res.locals;

      const comment = await commentService.create(
        article.id,
        user.id,
        req.body
      );

      const popularArticles = await articleService.findAllPopular();
      io.emit(`popular-articles`, popularArticles);

      const lastComments = await commentService.findAllLast();
      io.emit(`last-comments`, lastComments);

      return res.status(HttpCode.CREATED).json(comment);
    }
  );

  route.delete(
    `/articles/:articleId/comments/:commentId`,
    [authenticateJwt, isUserAdmin, isRouteParameterValid, isArticleExists],
    async (req, res) => {
      const { commentId } = req.params;
      const deletedComment = await commentService.delete(commentId);

      if (!deletedComment) {
        logger.error(
          `[${req.method}] Comment with id "${commentId}" not found ${req.originalUrl}`
        );

        return res
          .status(HttpCode.NOT_FOUND)
          .send(`Comment with ${commentId} not found`);
      }

      return res.status(HttpCode.OK).json(deletedComment);
    }
  );
};
