const fs = require('fs');
const os = require('os');
const inquirer = require('inquirer');
const fileExists = require('file-exists');
const ora = require('ora');

const { resumeCourse } = require('./init');

const spinner = ora();

module.exports = function() {
  const homeDir = os.homedir();
  const configExists = fileExists.sync(`${homeDir}/.coursehunters.json`);
  if (!configExists) {
    spinner.info('No courses found to resume downloading');
    return;
  }
  const config = JSON.parse(fs.readFileSync(`${homeDir}/.coursehunters.json`, 'utf8'));
  if (!config.courses.length > 0) {
    spinner.info('No courses found to resume downloading');
    return;
  }
  const courses = config.courses
    .filter(course => !course.downloadedCourse || !course.downloadedResources)
    .map(course => course.courseId);
  if (!courses.length > 0) {
    spinner.info('No courses found to resume downloading');
    return;
  }
  console.log(courses);
  return inquirer
    .prompt([
      {
        type: 'list',
        name: 'courseId',
        message: 'Select a course to download',
        paginated: true,
        choices: courses,
      },
    ])
    .then(({ courseId }) => {
      const course = config.courses.find(course => course.courseId === courseId);
      if (!course.downloadedCourse) {
        spinner.info(`Resuming Course Download At: ${course.rootDownloadPath}`);
        return resumeCourse(course, false);
      }
      if (!course.downloadedResources) {
        spinner.info(`Resuming Course Download Course At: ${course.rootDownloadPath}`);
        return resumeCourse(course, true);
      }
    });
};
