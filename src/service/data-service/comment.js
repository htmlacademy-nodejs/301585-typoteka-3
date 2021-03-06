"use strict";

const Alias = require(`../models/alias`);

class CommentService {
  constructor(sequelize) {
    this._Article = sequelize.models.Article;
    this._Comment = sequelize.models.Comment;
  }

  async create(articleId, userId, comment) {
    return await this._Comment.create({
      articleId,
      userId,
      ...comment,
    });
  }

  async delete(id) {
    const deletedRows = await this._Comment.destroy({
      where: {
        id,
      },
    });

    return !!deletedRows;
  }

  async findOne(id) {
    return await this._Comment.findByPk(id);
  }

  async findAllByArticle(articleId) {
    return await this._Comment.findAll({
      where: { articleId },
      raw: true,
      order: [[`createdAt`, `DESC`]],
    });
  }

  async findAll() {
    const comments = await this._Comment.findAll({
      include: [Alias.USERS, Alias.ARTICLES],
      order: [[`createdAt`, `DESC`]],
    });

    return comments.map((comment) => comment.get());
  }

  async findAllLast(limit = 4) {
    const comments = await this._Comment.findAll({
      include: [Alias.USERS],
      order: [[`createdAt`, `DESC`]],
      limit,
    });

    return comments.map((comment) => comment.get());
  }

  async findPage({ limit, offset } = {}) {
    const { count, rows } = await this._Comment.findAndCountAll({
      include: [Alias.USERS, Alias.ARTICLES],
      order: [[`createdAt`, `DESC`]],
      limit,
      offset,
      distinct: true,
    });

    return { count, comments: rows };
  }
}

module.exports = CommentService;
