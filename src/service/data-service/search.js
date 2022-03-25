"use strict";

class SearchService {
  constructor(articles) {
    this._articles = articles;
  }

  findAll(searchText) {
    return this._articles.filter((article) => {
      return article.title.toLowerCase().includes(searchText);
    });
  }
}

module.exports = SearchService;
