"use strict";

const { Router } = require(`express`);
const { getApi } = require(`../api`);

const { ARTICLES_PER_PAGE } = require(`../../constants`);

const upload = require(`../middlewares/multer`);
const isUserLogged = require(`../middlewares/is-user-logged`);
const isUserAdmin = require(`../middlewares/is-user-admin`);

const { ensureArray } = require(`../../utils`);

const api = getApi();

const articlesRoutes = new Router();

articlesRoutes.get(`/category/:id`, async (req, res, next) => {
  const { id } = req.params;

  let { page = 1 } = req.query;
  page = +page;

  const limit = ARTICLES_PER_PAGE;
  const offset = (page - 1) * ARTICLES_PER_PAGE;

  try {
    const [{ count, articles }, currentCategory, categories] =
      await Promise.all([
        api.getArticlesByCategory(id, { offset, limit }),
        api.getCategory(id),
        api.getCategories({ count: true }),
      ]);

    const totalPages = Math.ceil(count / ARTICLES_PER_PAGE);

    const data = {
      articles,
      categories,
      currentCategory,
      page,
      totalPages,
      count,
    };

    return res.render(`views/articles/articles-by-category`, data);
  } catch (err) {
    return next(err);
  }
});

articlesRoutes.get(`/add`, isUserAdmin, async (req, res, next) => {
  const { article = null, validationMessages = null } = req.session;

  try {
    const categories = await api.getCategories();

    req.session.article = null;
    req.session.validationMessages = null;

    const data = {
      article,
      categories,
      validationMessages,
    };

    return res.render(`views/articles/editor`, data);
  } catch (err) {
    return next();
  }
});

articlesRoutes.post(
  `/add`,
  [isUserAdmin, upload.single(`upload`)],
  async (req, res) => {
    const { body, file } = req;
    const { accessToken } = req.session;

    const article = {
      title: body.title,
      announce: body.announcement,
      fullText: body[`full-text`],
      date: body.date,
      categories: ensureArray(body.category),
      image: file ? file.filename : body.photo || ``,
    };

    try {
      await api.createArticle(article, accessToken);
      res.redirect(`/my`);
    } catch (err) {
      req.session.article = article;
      req.session.validationMessages = err.response.data.validationMessages;
      res.redirect(`back`);
    }
  }
);

articlesRoutes.get(`/edit/:id`, isUserAdmin, async (req, res, next) => {
  const { id } = req.params;
  const { updatedArticle = null, validationMessages = null } = req.session;

  try {
    let [article, categories] = await Promise.all([
      api.getArticle(id),
      api.getCategories(),
    ]);

    article = {
      ...article,
      categories: article.categories.map((category) => category.id),
    };

    if (updatedArticle) {
      article = {
        ...article,
        id,
      };
    }

    req.session.updatedArticle = null;
    req.session.validationMessages = null;

    const data = {
      article,
      categories,
      validationMessages,
    };

    return res.render(`views/articles/editor`, data);
  } catch (err) {
    return next(err);
  }
});

articlesRoutes.post(
  `/edit/:id`,
  [isUserAdmin, upload.single(`upload`)],
  async (req, res) => {
    const { body, file } = req;
    const { id } = req.params;
    const { accessToken } = req.session;

    const article = {
      title: body.title,
      announce: body.announcement,
      fullText: body[`full-text`],
      date: body.date,
      categories: ensureArray(body.category),
      image: file ? file.filename : body.photo || ``,
    };

    try {
      await api.updateArticle(id, article, accessToken);
      return res.redirect(`/my`);
    } catch (err) {
      req.session.updatedArticle = article;
      req.session.validationMessages = err.response.data.validationMessages;

      return res.redirect(`/articles/edit/${id}`);
    }
  }
);

articlesRoutes.get(`/:id`, async (req, res, next) => {
  const { id } = req.params;
  const { referer } = req.headers;
  const { validationMessages = null } = req.session;

  try {
    const [article, allCategories] = await Promise.all([
      api.getArticle(id, { comments: true }),
      api.getCategories({ count: true }),
    ]);

    const categories = allCategories.filter((category) => {
      return article.categories.some((item) => item.id === category.id);
    });

    req.session.validationMessages = null;

    const data = {
      article,
      categories,
      validationMessages,
      referer,
    };

    return res.render(`views/articles/article`, data);
  } catch (err) {
    return next();
  }
});

articlesRoutes.post(
  `/:id`,
  [isUserLogged, upload.single(`upload`)],
  async (req, res) => {
    const { body } = req;
    const { id } = req.params;
    const { accessToken } = req.session;

    const comment = {
      text: body.message,
    };

    try {
      await api.createComment(id, comment, accessToken);
      return res.redirect(`back`);
    } catch (err) {
      req.session.validationMessages = err.response.data.validationMessages;
      return res.redirect(`back`);
    }
  }
);

module.exports = articlesRoutes;
