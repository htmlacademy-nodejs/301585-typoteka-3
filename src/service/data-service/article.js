"use strict";

const { Sequelize, Op } = require(`sequelize`);

const Alias = require(`../models/alias`);

class ArticleService {
  constructor(sequelize) {
    this._Article = sequelize.models.Article;
    this._Comment = sequelize.models.Comment;
    this._Category = sequelize.models.Category;
    this._ArticleCategory = sequelize.models.ArticleCategory;
  }

  async create(articleData) {
    const article = await this._Article.create(articleData);
    await article.addCategories(articleData.categories);
    return article.get();
  }

  async delete(id) {
    const deletedRows = await this._Article.destroy({ where: { id } });
    return !!deletedRows;
  }

  async update(id, articleData) {
    const [affectedRows] = await this._Article.update(articleData, {
      where: { id },
    });

    const updatedArticle = await this._Article.findByPk(id);
    await updatedArticle.setCategories(articleData.categories);

    return !!affectedRows;
  }

  async findOne(id, { comments } = {}) {
    const include = [
      Alias.CATEGORIES,
      ...(comments
        ? [
            {
              model: this._Comment,
              as: Alias.COMMENTS,
              include: [Alias.USERS],
            },
          ]
        : []),
    ];

    const order = [
      ...(comments
        ? [[{ model: this._Comment, as: Alias.COMMENTS }, `createdAt`, `DESC`]]
        : []),
    ];

    return this._Article.findByPk(id, { include, order });
  }

  async findAll({ comments } = {}) {
    const include = [Alias.CATEGORIES, ...(comments ? [Alias.COMMENTS] : [])];

    const articles = await this._Article.findAll({
      include,
      order: [[`date`, `DESC`]],
    });

    return articles.map((article) => article.get());
  }

  async findAllByCategory(categoryId) {
    const include = [
      Alias.CATEGORIES,
      Alias.COMMENTS,
      {
        model: this._ArticleCategory,
        as: Alias.ARTICLES_CATEGORIES,
        attributes: [],
        required: true,
        where: { CategoryId: categoryId },
      },
    ];

    const articles = await this._Article.findAll({
      include,
      order: [[`date`, `DESC`]],
    });

    return articles.map((article) => article.get());
  }

  async findAllPopular(limit = 4) {
    const articles = await this._Article.findAll({
      attributes: {
        include: [
          [Sequelize.fn(`COUNT`, Sequelize.col(`comments.id`)), `count`],
        ],
      },
      include: [
        {
          model: this._Comment,
          as: Alias.COMMENTS,
          attributes: [],
          duplicating: false,
          where: {
            [`id`]: {
              [Op.ne]: null,
            },
          },
        },
      ],
      group: [`Article.id`],
      order: [[Sequelize.col(`count`), `DESC`]],
      limit,
    });

    return articles.map((article) => article.get());
  }

  async findPage({ comments, limit, offset } = {}) {
    const include = [Alias.CATEGORIES, ...(comments ? [Alias.COMMENTS] : [])];

    const { count, rows } = await this._Article.findAndCountAll({
      limit,
      offset,
      include,
      order: [[`date`, `DESC`]],
      distinct: true,
    });

    return { count, articles: rows };
  }

  async findPageByCategory(categoryId, { offset, limit } = {}) {
    const include = [
      Alias.CATEGORIES,
      Alias.COMMENTS,
      {
        model: this._ArticleCategory,
        as: Alias.ARTICLES_CATEGORIES,
        attributes: [],
        required: true,
        where: { CategoryId: categoryId },
      },
    ];

    const { count, rows } = await this._Article.findAndCountAll({
      include,
      distinct: true,
      offset,
      limit,
      order: [[`date`, `DESC`]],
    });

    return { count, articles: rows.map((item) => item.get()) };
  }
}

module.exports = ArticleService;
