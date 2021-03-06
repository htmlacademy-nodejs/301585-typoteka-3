"use strict";

const { Router } = require(`express`);
const { getApi } = require(`../api`);

const {
  COMMENTS_PER_PAGE,
  CATEGORIES_PER_PAGE,
  ARTICLES_PER_PAGE,
} = require(`../../constants`);

const upload = require(`../middlewares/multer`);
const isUserAdmin = require(`../middlewares/is-user-admin`);

const api = getApi();

const myRoutes = new Router();

myRoutes.use(isUserAdmin);

myRoutes.get(`/`, async (req, res, next) => {
  let { page = 1 } = req.query;
  page = +page;

  const limit = ARTICLES_PER_PAGE;
  const offset = (page - 1) * ARTICLES_PER_PAGE;

  try {
    const { count, articles } = await api.getArticles({ limit, offset });

    const totalPages = Math.ceil(count / ARTICLES_PER_PAGE);

    const data = { articles, page, totalPages };

    return res.render(`views/my/index`, data);
  } catch (err) {
    return next(err);
  }
});

myRoutes.get(`/articles/:articleId`, async (req, res, next) => {
  const { accessToken } = req.session;
  const { articleId } = req.params;

  try {
    await api.deleteArticle(articleId, accessToken);
    res.redirect(`back`);
  } catch (err) {
    next(err);
  }
});

myRoutes.get(`/comments`, async (req, res, next) => {
  let { page = 1 } = req.query;
  page = +page;

  const limit = COMMENTS_PER_PAGE;
  const offset = (page - 1) * COMMENTS_PER_PAGE;

  try {
    const { count, comments } = await api.getComments({ limit, offset });

    const totalPages = Math.ceil(count / COMMENTS_PER_PAGE);

    const data = { comments, page, totalPages };

    return res.render(`views/my/comments`, data);
  } catch (err) {
    return next(err);
  }
});

myRoutes.get(`/comments/:articleId/:id`, async (req, res, next) => {
  const { accessToken } = req.session;
  const { articleId, id } = req.params;

  try {
    await api.deleteComment(id, articleId, accessToken);
    res.redirect(`back`);
  } catch (err) {
    next(err);
  }
});

myRoutes.get(`/categories`, async (req, res, next) => {
  const {
    newCategory,
    creationValidationMessages,
    updatedCategory,
    updateValidationMessages,
    deletedCategory,
    deleteValidationMessages,
  } = req.session;

  req.session.newCategory = null;
  req.session.creationValidationMessages = null;

  req.session.updatedCategory = null;
  req.session.updateValidationMessages = null;

  req.session.deletedCategory = null;
  req.session.deleteValidationMessages = null;

  let { page = 1 } = req.query;
  page = +page;

  const limit = COMMENTS_PER_PAGE;
  const offset = (page - 1) * CATEGORIES_PER_PAGE;

  try {
    const { count, categories } = await api.getCategories({ limit, offset });

    const totalPages = Math.ceil(count / CATEGORIES_PER_PAGE);

    const data = {
      categories,
      page,
      totalPages,
      newCategory,
      creationValidationMessages,
      updatedCategory,
      updateValidationMessages,
      deletedCategory,
      deleteValidationMessages,
    };

    return res.render(`views/my/categories`, data);
  } catch (err) {
    return next(err);
  }
});

myRoutes.post(`/categories`, upload.single(`upload`), async (req, res) => {
  const { body } = req;
  const { accessToken } = req.session;

  const category = {
    name: body[`add-category`],
  };

  try {
    await api.createCategory(category, accessToken);
    return res.redirect(`/my/categories`);
  } catch (error) {
    req.session.newCategory = category;
    req.session.creationValidationMessages =
      error.response.data.validationMessages;

    return res.redirect(`/my/categories`);
  }
});

myRoutes.post(
  `/categories/:categoryId`,
  upload.single(`upload`),
  async (req, res) => {
    const { body } = req;
    const { categoryId } = req.params;
    const { accessToken } = req.session;

    const category = {
      name: body[`category-${categoryId}`],
    };

    try {
      await api.updateCategory(categoryId, category, accessToken);
      return res.redirect(`/my/categories`);
    } catch (error) {
      req.session.updatedCategory = {
        ...category,
        id: Number(categoryId),
      };
      req.session.updateValidationMessages =
        error.response.data.validationMessages;

      return res.redirect(`/my/categories`);
    }
  }
);

myRoutes.get(`/categories/:categoryId`, async (req, res) => {
  const { categoryId } = req.params;
  const { accessToken } = req.session;

  try {
    await api.deleteCategory(categoryId, accessToken);
    return res.redirect(`/my/categories`);
  } catch (error) {
    req.session.deletedCategory = { id: Number(categoryId) };
    req.session.deleteValidationMessages =
      error.response.data.validationMessages;

    return res.redirect(`/my/categories`);
  }
});

module.exports = myRoutes;
