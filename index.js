#!/usr/bin/env node
const url = require('url');
const fs = require('fs');
const os = require('os');
const fileExists = require('file-exists');
const urlRegex = require('url-regex');
const args = require('args');
const ora = require('ora');
const printMessage = require('print-message');
const username = require('username');

const updateNotifier = require('update-notifier');
const { red, bold, green, blue } = require('chalk');
const nodeVersion = require('node-version');

const pkg = require('./package');
const { init, scrapeAndDownload, resumeCourse } = require('./init');
const resume = require('./resume.js');

// Throw an error if node version is too low
if (nodeVersion.major < 6) {
  console.error(
    `${red(
      'Error!'
    )} coursehunters-cli requires at least version 6 of Node. Please upgrade from here https://nodejs.org`
  );
  process.exit(1);
}

// Let user know if there's an update
updateNotifier({ pkg }).notify();

// Print welcome message
const name = username.sync();
printMessage([
  `Hello, ${green(name)}`,
  `Welcome to ${green(`coursehunters-cli@${pkg.version}`)}`,
  `If you like ${blue(bold('https://coursehunters.net'))} donate here ${blue(
    bold('https://money.yandex.ru/to/410014915713048')
  )}`,
]);

const spinner = ora();
spinner.start('Initializing Please wait');

args
  .option('resume', 'Allows you to select a Course to resume if available')
  .option('url', 'The course url to download')
  .example(
    'coursehunters',
    'Allows you to select a course interactively for downloading '
  )
  .example(
    'coursehunters --url https://coursehunters.net/course/fm-introduction-vue',
    'Download a course from URL'
  )
  .example(
    'coursehunters --resume',
    'Allows you to select a Course to resume if available'
  )
  .example('coursehunters help', 'Show Usage Information');

const flags = args.parse(process.argv);

if (flags.url) {
  // Download that course
  spinner.succeed('Initialized Successfully');
  // Check if thats a valid url
  if (urlRegex({ exact: true }).test(flags.url)) {
    // Check if its a valid coursehunters course url
    const urlData = url.parse(flags.url);
    if (
      urlData.hostname === 'coursehunters.net' &&
      /\/course\/.+/.test(urlData.pathname)
    ) {
      // Scrape course and download course
      const coursePath = urlData.pathname;
      const courseId = coursePath.split('/')[2];
      const homeDir = os.homedir();
      // Check if course already requested for download if so resume
      const configExists = fileExists.sync(`${homeDir}/.coursehunters.json`);
      if (configExists) {
        // Retrieve course data from local config file which we saved before
        const config = JSON.parse(
          fs.readFileSync(`${homeDir}/.coursehunters.json`, 'utf8')
        );
        if (config.courses.length > 0) {
          const courses = config.courses.filter(
            course =>
              !course.downloadedCourse ||
              (!course.downloadedResources && course.resources.length > 0)
          );
          const course = courses.find(course => course.courseId === courseId);
          if (course && !course.downloadedCourse) {
            spinner.info(
              `Resuming Course Download At: ${course.rootDownloadPath}`
            );
            // If course found and not downloaded fully then resume
            return resumeCourse(course, false)
              .then(console.log)
              .catch(console.log);
          }
          if (course && !course.downloadedResources) {
            spinner.info(
              `Resuming Course Download Course At: ${course.rootDownloadPath}`
            );
            // If course found and resources are not downloaded the resume
            return resumeCourse(course, true)
              .then(console.log)
              .catch(console.log);
          }
        }
      }
      scrapeAndDownload(urlData.pathname, courseId)
        .then(console.log)
        .catch(console.log);
    } else {
      // Exit and show error
      spinner.fail('Enter a valid coursehunters course URL');
      spinner.info(
        'Valid Url Format: https://coursehunters.net/course/fm-introduction-vue'
      );
      process.exit(1);
    }
  } else {
    // Exit and show error
    spinner.fail('Enter a valid URL');
    spinner.info(
      'Valid Url Format: https://coursehunters.net/course/fm-introduction-vue'
    );
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
    .then(() => {
      printMessage([
        `Hooray! Download is completed`,
        `If you like ${blue(
          bold('https://coursehunters.net')
        )} donate here ${blue(
          bold('https://money.yandex.ru/to/410014915713048')
        )}`,
      ]);
    })
    .catch(err => {
      spinner.fail(err.message);
      printMessage([
        'Please report this error here',
        `${blue(
          bold('https://github.com/tezhub/coursehunters-cli/issues/new')
        )}`,
      ]);
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
