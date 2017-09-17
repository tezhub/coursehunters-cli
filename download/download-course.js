const fs = require('fs');
const os = require('os');
const fileExists = require('file-exists');
const mkdirp = require('mkdirp');
const ora = require('ora');
const printMessage = require('print-message');
const { green, red } = require('chalk');
const downloadProgress = require('./download');

const spinner = ora();

const download = (
  links = [],
  courseId,
  rootDownloadPath,
  isResource = false
) => {
  const homeDir = os.homedir();
  const configExists = fileExists.sync(`${homeDir}/.coursehunters.json`);
  let config = {};
  if (configExists) {
    config = JSON.parse(
      fs.readFileSync(`${homeDir}/.coursehunters.json`, 'utf8')
    );
    const course = config.courses.find(course => course.courseId === courseId);
    const courseIndex = config.courses.findIndex(
      course => course.courseId === courseId
    );
    if (!course && !isResource) {
      config.courses.push({
        courseId,
        links,
        rootDownloadPath,
        downloadedResources: false,
        downloadedCourse: false,
      });
      fs.writeFileSync(
        `${homeDir}/.coursehunters.json`,
        JSON.stringify(config, null, 2)
      );
    } else {
      course.resources = links;
      config.courses.splice(courseIndex, 1, course);
      fs.writeFileSync(
        `${homeDir}/.coursehunters.json`,
        JSON.stringify(config, null, 2)
      );
    }
  } else {
    config.courses = [
      {
        courseId,
        links,
        rootDownloadPath,
        downloadedResources: false,
        downloadedCourse: false,
      },
    ];
    console.log('Course Does not Exists, So creating new one');
    fs.writeFileSync(
      `${homeDir}/.coursehunters.json`,
      JSON.stringify(config, null, 2)
    );
  }
  return new Promise((resolve, reject) => {
    const downloadPath = `${rootDownloadPath}/coursehunters/${courseId}`;

    const urls = links.map((link, i) => {
      let filename;
      if (isResource) {
        filename = `${i}-${link.title}`;
      } else {
        filename = `${i}-${link.title}.mp4`;
      }
      return { url: link.file, title: filename, dest: downloadPath };
    });

    mkdirp(downloadPath, err => {
      if (err) return console.error(err);
      fs.writeFileSync(
        `${downloadPath}/data.json`,
        JSON.stringify(links, null, 2)
      );
      if (urls.length === 0) {
        return resolve('Done');
      }
      spinner.info(`Downloading Course At: ${downloadPath}`);
      printMessage([
        `You can stop this process by pressing ${red('ctrl+c')}.`,
        `Don't worry you can resume this course later through ${green(
          'coursehunters -r'
        )}`,
      ]);
      const download = downloadProgress(urls, {});
      download.get(err => {
        if (err) {
          reject(new Error(err));
        }
        const course = config.courses.find(
          course => course.courseId === courseId
        );
        const courseIndex = config.courses.findIndex(
          course => course.courseId === courseId
        );
        if (isResource) {
          course.downloadedResources = true;
        } else {
          course.downloadedCourse = true;
        }
        config.courses.splice(courseIndex, 1, course);
        fs.writeFileSync(
          `${homeDir}/.coursehunters.json`,
          JSON.stringify(config, null, 2)
        );
        resolve('Done');
      });
    });
  });
};

module.exports = download;
