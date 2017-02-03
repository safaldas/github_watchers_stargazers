var request = require('request');
var readFile = require('./utils').readFile
var fs = require('fs')
var colors = require('colors')
var mkdirp = require('mkdirp')


var reposPath = '/repos/';
var usersPath = '/users/';

function options(path) {
  return {
    url: 'https://api.github.com' + path,
    headers: {
      'User-Agent': 'safal',
      'Authorization': 'token ' + process.env.GHTOKEN
    }
  };
}

//////////////////////////////
//  Watchers are the subscribers 
//////////////////////////// 


function getWatchers(pageNumber, repoName) {
  return new Promise((resolve, reject) => {
    let path = reposPath + repoName + `/subscribers?page=${pageNumber}&per_page=100`;

    var userName = [];
    request(options(path), function (error, response, body) {
      if (!error && response.statusCode == 200) {

        var info = JSON.parse(body);

        info.forEach((user) => {
          userName.push(user.login);
        });
        resolve(userName)
      } else {
        reject(error)
      }
    })
  })
}


function getStarGazers(pageNumber, repoName) {
  return new Promise((resolve, reject) => {
    let path = reposPath + repoName + `/stargazers?page=${pageNumber}&per_page=100`;

    var userName = [];
    request(options(path), function (error, response, body) {
      if (!error && response.statusCode == 200) {

        var info = JSON.parse(body);

        info.forEach((user) => {
          userName.push(user.login);
        });
        resolve(userName)
      } else {
        reject(error)
      }
    })
  })
}

function getWatchersData(info, repoName) {

  return new Promise((resolve, reject) => {

    // console.log(info)
    let watchers = info.subscribers_count;

    let totalPagesOfWatchers = Math.ceil(watchers / 100);
    let usersList = []
    let execCount = 0;
    for (let i = 1; i <= totalPagesOfWatchers; i++) {
      getWatchers(i, repoName).then(data => {
        usersList = usersList.concat(data)
        execCount++;
        console.log(execCount, ' of ', totalPagesOfWatchers, ' pages.')
        if (execCount == totalPagesOfWatchers) {
          resolve(usersList)
        }
      }, err => {
        reject(err)
      })
    }


  })

}

function getStarGazersData(info, repoName) {
  return new Promise((resolve, reject) => {
    let starGazers = info.stargazers_count;
    let totalPagesOfStargazers = Math.ceil(starGazers / 100);
    let usersList = []
    let execStarCount = 0;
    for (let i = 1; i <= totalPagesOfStargazers; i++) {
      getStarGazers(i, repoName).then(data => {
        usersList = usersList.concat(data)
        execStarCount++;
        // console.log(execStarCount, totalPagesOfStargazers)
        if (execStarCount == totalPagesOfStargazers) {
          resolve(usersList)
        }
      }, err => {
        reject(err)
      })
    }


  })

}

function findUsernames(repoName) {
  console.log("Finding UserNames from repo ", repoName)
  let file = ''
  request(options(reposPath + repoName), function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var info = JSON.parse(body);
      // /////////////////////
      // Watchers ///
      // ////////////////////
      getWatchersData(info, repoName).then(UserNames => {
        console.log('total Watchers : ' + UserNames.length)
        file = repoName + '/' + repoName.split('/')[1] + 'Watchers.txt'
        console.log(file)
        fs.writeFile(file, UserNames, (err) => {
          if (err) throw err;
          else console.log('Watchers list saved!');
        });
      }, err => {
        console.log(err);
      })


      // ///////////////////
      // /// starGazers
      // /////////////////
      getStarGazersData(info, repoName).then(UserNames => {
        console.log('total StarGazers : ' + UserNames.length)
        file = repoName + '/' + repoName.split('/')[1] + 'StarGazers.txt'
        fs.writeFile(file, UserNames, (err) => {
          if (err) throw err;
          console.log('StarGazers list saved!');
        });
      }, err => {
        console.log(err);
      })

    } else {
      console.log(error)
    }
  });
}

/////////////////////////////////////////
////// get user Email ///////
//////////////////////////////////
function getUserEmail(username, filename) {
  console.log("Requesting userdata for ".yellow, username.yellow)
  let time = new Date().getTime()
  return new Promise((resolve, reject) => {
    request(options(usersPath + username), function (error, response, body) {
      if (error) {
        console.log("Request Error".magenta, error)
        console.log('Sending Next request, setting remaining to true ')
        let status={requestRemaining:true}
        resolve(status)
      } else {
        let status = {},
          email = ''

        status.requestRemaining = parseInt(response.caseless.dict['x-ratelimit-remaining']),
          status.nextTime = parseInt(response.caseless.dict['x-ratelimit-reset'])
        if (status.requestRemaining == 0) {
          console.log('IN getUserEmail \n')
          status.limitExceeded = true
          console.log(status)
          reject(status) // no more requests remaining
        } else {
          let user = JSON.parse(body),
            fileData = ''
          email = user.email
          console.log("Got user ".green, user.login.blue, email)
          if (email) {
            fileData = user.login + ',' + email + '\n'
            fs.appendFile(filename, fileData, (err) => { //  append to file for every returning
              if (err) {
                console.log('ERROR WRITING FILE\n')
                throw err;
              }
              console.log('Time taken = ', new Date().getTime() - time, 'ms')
              console.log('Saved '.gray, email.gray);
            })
          }
          resolve(status)
        }
      }
    })
  })

}

function userEmailRequests(Usernames, filename) {
  return new Promise((resolve, reject) => {
    console.log('Started requesting user Data..............\n'.green)
    if (Usernames.length) {
      console.log('Usernames left=>'.cyan, Usernames.length)
      getUserEmail(Usernames[0], filename) //request api for email
        .then(status => {
          if (status.requestRemaining) {
            userEmailRequests(Usernames.slice(1), filename) //recursion after slicing the first one
              .then(status => {
                resolve(status)
              })
              .catch(status => {
                reject(status)
              })
          } else {
            resolve(status)
          }
        })
        .catch(status => {
          reject(status)
        })
    } else {
      resolve('Completed')
    }

  })

}

function test() {
  console.log("In test function getting data........")
  return new Promise((resolve, reject) => {
    request(options('/user'), function (error, response, body) {
      console.log(response.caseless.dict)
      let data = {}
      data.requestRemaining = parseInt(response.caseless.dict['x-ratelimit-remaining'])
      data.nextTime = parseInt(response.caseless.dict['x-ratelimit-reset'])
      data.body = body
      resolve(data)
      if (error) {
        reject(error)
      }
    })
  })
}

function scheduleGetEmailRequest(fileName) {
  test()
    .then(data => {
      interval = 3600000
      readFile(fileName)
        .then((Usernames) => { //read file and get usernames
          let totalUsers = Usernames.length,
            file = fileName.split('.')[0] + '.csv'
          fs.writeFile(file, 'username,email\n', function (err, fd) { //openfile for writing and reading
            if (err) console.log(err);
            else {
              console.log('Opened ', file, ' for writing.')

              userEmailRequests(Usernames, file) //when opened request for emails
                .then(status => {
                  console.log('////////////////////////finished getting user mails //////////////////////////\n', status)
                })
                .catch((error) => {
                  console.log('errored to scheduleGetEmailRequest =', error)
                })
            }
          })
        })
        .catch(err => {
          console.log('readfile =>', err)
        })
    })
    .catch(err => {
      console.log('test error =>', err)
    })

}

function prepare(repoName) {
  mkdirp(repoName, function (err) {
    if (err) console.error(err)
    else {
      console.log('Folder created')
      findUsernames(repoName)
    }
  })
}

let repoName = 'bumptech/glide' //frankiesardo/icepick
let watchers = 'Watchers.txt',
  stargazers = 'StarGazers.txt'
let watchersFileName = repoName + '/' + repoName.split('/')[1] + watchers,
  stargazersFileName = repoName + '/' + repoName.split('/')[1] + stargazers

///////// use functions here ///////////////
// prepare(repoName)
// scheduleGetEmailRequest(watchersFileName)
scheduleGetEmailRequest(stargazersFileName)
// test()