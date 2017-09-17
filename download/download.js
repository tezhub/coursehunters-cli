const ProgressBar = require('tezhub-progress');
const bytes = require('bytes');
const async = require('async');
const ora = require('ora');
const { green, yellow, blue, magenta, cyan } = require('chalk');
const jswget = require('./jswget');

const spinner = ora();

function DownloadProgress(urls, options) {
  if (!urls) {
    throw new Error('urls not set');
  }

  if (!(this instanceof DownloadProgress)) {
    return new DownloadProgress(urls, options);
  }

  this.urls = urls;
  this.options = options || {};

  // TODO: Detect from URL if is https or http
  this.protocol = 'https';
}

DownloadProgress.prototype.get = function(callbackAllFilesFetched) {
  async.eachSeries(
    this.urls,
    (url, callbackRequestDone) => {
      this._getFile(url.url, url.title, url.dest, err => {
        if (err) {
          throw new Error(err);
        }
        callbackRequestDone();
      });
    },
    err => {
      if (err) {
        callbackAllFilesFetched(err);
      }
      callbackAllFilesFetched();
    }
  );
};

let bar;
DownloadProgress.prototype._getFile = function(url, title, dest, callback) {
  jswget({
    url,
    downloadmode: true,
    // If not given will try to get name from last path, otherwise force to use this name
    downloadas: title,
    // If not given, the default path is where the program run
    downloadpath: `${dest}/`,
    method: 'GET',
    onsend() {},
    onhead(fstat, req, res) {
      const fileSize = parseInt(res.headers['content-length'], 10);
      bar = new ProgressBar(
        `${green('[:bar]')} ${blue(':percent')}  ${yellow(
          ':current/:total'
        )}  ${cyan(':rate/s')}  ${magenta(':etas')}`,
        {
          complete: '=',
          incomplete: ' ',
          width: 50,
          total: fileSize,
          format: bytes,
        }
      );
      if (fstat && fstat.size) {
        console.log(`Resuming ${title}`);
        bar.tick(fstat.size);
      } else {
        console.log(`Downloading ${title}`);
      }
    },
    // Args: chunk, req, res
    ondata(chunk) {
      bar.tick(chunk.length);
    },
    // Args: resp, req, res
    onsuccess() {
      spinner.succeed(`Downloaded ${title}`);
      callback();
    },
    // Args: err, req
    onerror(err) {
      spinner.fail(`Downloading ${title} Failed`);
      console.log('Error', err);
    },
  });
};

module.exports = DownloadProgress;
