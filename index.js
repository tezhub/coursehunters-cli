#!/usr/bin/env node
const url = require('url');
const urlRegex = require('url-regex');
const args = require('args');
const ora = require('ora');

const spinner = ora();
const { init, scrapeAndDownload } = require('./init');
const resume = require('./resume.js');

spinner.start('Initializing Please wait');

args
  .option('resume', 'Allows you to select a Course to resume if available')
  .option('url', 'The course url to download')
  .example('coursehunters', 'Allows you to select a course interactively for downloading ')
  .example(
    'coursehunters --url https://coursehunters.net/course/fm-introduction-vue',
    'Download a course from URL'
  )
  .example('coursehunters --resume', 'Allows you to select a Course to resume if available')
  .example('coursehunters help', 'Show Usage Information');

const flags = args.parse(process.argv);

if (flags.url) {
  // Download that course
  spinner.succeed('Initialized Successfully');
  // Check if thats a valid url
  if (urlRegex({ exact: true }).test(flags.url)) {
    // Check if its a valid coursehunters course url
    const urlData = url.parse(flags.url);
    if (urlData.hostname === 'coursehunters.net' && /\/course\/.+/.test(urlData.pathname)) {
      // Scrape course and download course
      const coursePath = urlData.pathname;
      const courseId = coursePath.split('/')[2];
      scrapeAndDownload(urlData.pathname, courseId)
        .then(console.log)
        .catch(console.log);
    } else {
      // Exit and show error
      spinner.fail('Enter a valid coursehunters course URL');
      spinner.info('Valid Url Format: https://coursehunters.net/course/fm-introduction-vue');
      process.exit(1);
    }
  } else {
    // Exit and show error
    spinner.fail('Enter a valid URL');
    spinner.info('Valid Url Format: https://coursehunters.net/course/fm-introduction-vue');
    process.exit(1);
  }
} else if (flags.resume) {
  spinner.succeed('Initialized Successfully');
  resume()
    .then(msg => {
      console.log(msg);
      process.exit(0);
    })
    .catch(err => {
      spinner.fail(err.message);
      process.exit(1);
    });
} else {
  // Ask user interactively which course to download
  spinner.succeed('Initialized Successfully');
  init()
    .then(console.log)
    .catch(err => {
      spinner.fail(err.message);
      process.exit(1);
    });
}

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
    console.error(err, 'Uncaught Exception thrown');
    process.exit(1);
  });
