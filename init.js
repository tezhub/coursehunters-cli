const os = require('os');
const inquirer = require('inquirer');

const scrapeNav = require('./scrape/scrape-nav');
const scrapeCourses = require('./scrape/scrape-courses');
const scrapeCourse = require('./scrape/scrape-course');
const downloadCourse = require('./download/download-course');

inquirer.registerPrompt('directory', require('inquirer-select-directory'));

function init() {
  // Fetch navigation list
  let _navItems = [];
  let _navItem;
  let _courses = [];
  return scrapeNav()
    .then(navItems => {
      _navItems = navItems;
      if (_navItems.length > 0) {
        // Show and Ask user which category courses they want
        return inquirer.prompt([
          {
            type: 'list',
            name: 'navId',
            message: 'Select a category',
            choices: navItems.map(item => item.name),
          },
        ]);
      }
      throw new Error('Scrapping of navigation list failed!.');
    })
    .then(({ navId }) => {
      _navItem = _navItems.find(item => item.name === navId);
      // Get sbcategories for selected navItem
      const subNavItems = _navItem.subCategories.map(item => item.name);
      // Show and Ask user which sub category courses they want
      return inquirer.prompt([
        {
          type: 'list',
          name: 'subNavId',
          message: 'Show courses for',
          choices: ['All', ...subNavItems],
        },
      ]);
    })
    .then(({ subNavId }) => {
      let subNavItemPath;
      if (subNavId === 'All') {
        subNavItemPath = _navItem.path;
      } else {
        subNavItemPath = _navItem.subCategories.find(item => item.name === subNavId).path;
      }
      // Fetch all courses for selected category/sub-category
      return scrapeCourses(subNavItemPath);
    })
    .then(courses => {
      _courses = courses;
      if (_courses.length > 0) {
        // Show and Ask user which course they want to download
        return inquirer.prompt([
          {
            type: 'list',
            name: 'courseId',
            message: 'Select a course to download',
            paginated: true,
            choices: courses.map(lesson => lesson.name),
          },
        ]);
      }
      throw new Error('Scrapping of courses list failed');
    })
    .then(({ courseId }) => {
      const coursePath = _courses.find(course => course.name === courseId).path;
      return inquirer
        .prompt([
          {
            type: 'directory',
            name: 'downloadPath',
            message: 'Where you like to download this course?',
            basePath: os.homedir(),
          },
        ])
        .then(({ downloadPath }) => {
          // Scrape course and download selected course
          return scrapeAndDownload(coursePath, courseId, downloadPath);
        });
    });
}

function scrapeAndDownload(coursePath, courseId, downloadPath) {
  return scrapeCourse(coursePath)
    .then(({ courseData, resources }) => {
      if (courseData.length > 0) {
        return downloadCourse(courseData, courseId, downloadPath).then(() => {
          // Download course resources
          return downloadCourse(resources, courseId, downloadPath, true);
        });
      }
      throw new Error('Scrapping course playlist failed!');
    })
    .then(() => {
      return 'Completed';
    });
}

function resumeCourse({ links, resources, courseId, rootDownloadPath }, isResource) {
  if (isResource) {
    // Download course resources
    return downloadCourse(resources, courseId, rootDownloadPath, true);
  }
  return downloadCourse(links, courseId, rootDownloadPath).then(() => {
    // Download course resources
    return downloadCourse(resources, courseId, rootDownloadPath, true);
  });
}

module.exports = { init, scrapeAndDownload, resumeCourse };
