'use latest';
const axios = require('axios');
const cheerio = require('cheerio');
const _ = require('lodash');
const ora = require('ora');

const spinner = ora();

// Get all categories
// for each category get all video links and subCategories
// then for each SubCategories get all video links

function fetchNavItems() {
  const navItems = [];
  spinner.start('Getting Navigation Menu');
  return axios
    .get('https://coursehunters.net')
    .then(({ data }) => {
      const $nav = cheerio.load(data);
      $nav('nav.nav ul li').each(function(i) {
        const href = $nav(this)
          .find('a')
          .attr('href');
        if (href) {
          navItems[i] = {
            path: href.replace(/\\t( +)?|\\n( +)?/, ''),
            name: href.replace(/\\t( +)?|\\n( +)?/, '').split('/')[1],
          };
        }
      });
      return Promise.all(navItems.map(item => axios.get(`https://coursehunters.net${item.path}`)));
    })
    .then(results => {
      results.forEach(({ data }, i) => {
        const $ = cheerio.load(data);
        const subCategories = [];
        $('.crumbs-filters').each(function(j) {
          const href = $(this).attr('href');
          if (href) {
            subCategories[j] = {
              path: href.replace(/\\t( +)?|\\n( +)?/, ''),
              name: href.replace(/\\t( +)?|\\n( +)?/, '').split('/')[2],
            };
          }
        });
        if (subCategories.length === 2) {
          navItems[i] = Object.assign(navItems[i], { subCategories: [] });
        } else {
          navItems[i] = Object.assign(navItems[i], {
            subCategories: _.drop(subCategories, 3),
          });
        }
      });
      spinner.succeed('Getting Navigation Menu');
      return navItems;
    });
}

module.exports = function() {
  return fetchNavItems();
};
