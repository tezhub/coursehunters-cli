'use latest';
const vm = require('vm');
const axios = require('axios');
const cheerio = require('cheerio');
const _ = require('lodash');
const ora = require('ora');

const spinner = ora();

function fetchLessons(coursePath) {
  spinner.start(`Fetching Lessons from ${coursePath}`);
  return axios.get(`https://coursehunters.net${coursePath}`).then(({ data }) => {
    const $ = cheerio.load(data);
    let scripts = [];
    $('body > script')
      .not('[src]')
      .not('[id]')
      .not('[type]')
      .each(function() {
        scripts.push($(this).html());
      });

    scripts = _.dropRight(_.drop(scripts, 1), 1);
    scripts = _.drop(scripts, 1);
    const _script = scripts.join('');
    const sandbox = { myPlaylist: [] };
    try {
      vm.runInNewContext(_script, sandbox);
    } catch (err) {
      throw new Error('Not able to find course playlist');
    }
    const { myPlaylist } = sandbox;
    const resources = [];
    $('.downloads').each(function(i) {
      const href = $(this).attr('href');
      if (href) {
        resources[i] = { file: href, title: href.split('/').reverse()[0] };
      }
    });
    spinner.succeed(`Fetched Lessons from ${coursePath}`);
    return {
      courseData: myPlaylist,
      resources,
    };
  });
}

module.exports = function(coursePath) {
  return fetchLessons(coursePath);
};
