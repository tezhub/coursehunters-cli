'use latest';

const axios = require('axios');
const cheerio = require('cheerio');
const _ = require('lodash');
const ora = require('ora');

const spinner = ora();

function fetchLessons(categoryPath) {
  spinner.start(`Fetching Courses from ${categoryPath}`);
  return axios.get(`https://coursehunters.net${categoryPath}`).then(({ data }) => {
    const $ = cheerio.load(data);
    let pages = [];
    $('.pagination ul li').each(function(i) {
      pages[i] = $(this)
        .find('a')
        .text();
    });
    pages = _.dropRight(_.drop(pages, 1), 1);
    pages = pages.length ? Number(_.last(pages)) : 1;
    const pagePromises = [axios.get(`https://coursehunters.net${categoryPath}`)];
    for (let k = 2; k <= pages; k++) {
      pagePromises.push(axios.get(`https://coursehunters.net${categoryPath}?page=${k}`));
    }
    return Promise.all(pagePromises).then(results => {
      const lessons = [];
      results.forEach(({ data }) => {
        const $ = cheerio.load(data);
        $('.russian').each(function() {
          const href = $(this).attr('href');
          if (href) {
            lessons.push({ path: href, name: href.split('/')[2] });
          }
        });
      });
      spinner.succeed(`Fetched Courses from ${categoryPath}`);
      return lessons;
    });
  });
}

module.exports = function(categoryPath) {
  return fetchLessons(categoryPath);
};
