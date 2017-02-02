var request = require('request');
var readFile = require('./utils').readFile
var fs = require('fs')
var colors = require('colors')
var mkdirp = require('mkdirp')

Date.prototype.getUnixTime = function () {
  return this.getTime() / 1000 | 0
};

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
        console.log(execCount, totalPagesOfWatchers)
        if (execCount == totalPagesOfWatchers) {
          console.log(usersList)
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
      /////////////////////
       Watchers///
      ////////////////////
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
function getUserEmail(username) {
  console.log("Requesting userdata for ".yellow, username.yellow)
  let time = new Date().getTime()
  return new Promise((resolve, reject) => {
    request(options(usersPath + username), function (error, response, body) {
      if (error) {
        console.log("Request Error".magenta, error)
        reject(error)
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
          let user = JSON.parse(body)
          email = user.email
          console.log("Got user ".green, user.login.blue, email)
          if (email) {
            email = email + ','
            fs.appendFile('emails.txt', email, (err) => { //  append to file for every returning
              if (err) {
                console.log('ERROR WRITING FILE\n')
                throw err;
              }
              console.log('Saved '.gray, email.gray);
            })
          }
          resolve(status)
        }
      }
    })
  })

}

function userEmailRequests(Usernames) {
  return new Promise((resolve, reject) => {
    console.log('Started requesting user Data..............\n'.green)
    if (Usernames.length) {
      console.log('Usernames left=>'.cyan, Usernames.length)
      getUserEmail(Usernames[0])
        .then(status => {
          if (status.requestRemaining) {
            userEmailRequests(Usernames.slice(1))
          } else {
            resolve(status)
          }
        })
        .catch(status => {
          console.log('In userEmailRequests=> ', status)
          reject(status)
        })
    } else {
      reject('Completed')
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
  let interval = 0
  test()
    .then(data => {
      interval = 3600000
      readFile(fileName)
        .then((Usernames) => { //read file and get usernames
          let totalUsers = Usernames.length,
            dispatchCount = 0,
            numberOfDispatches = Math.ceil(totalUsers / 5000); //get the number of times to schedule these  as 5000 per hour is only permitted

          if (numberOfDispatches > 2) {

            //call get email function numberOfDispatches times back to back        
            let intervalId = setInterval(function dispatcher() {
              if (dispatchCount == numberOfDispatches) {
                clearInterval(intervalId)
              } else {
                let names = Usernames.slice(dispatchCount * 5000, dispatchCount * 5000 + 5000)
                userEmailRequests(names)
                  .then(status => {
                    console.log(status)
                  })
                  .catch((count) => {
                    console.log('count=', count)
                  })
              }
              dispatchCount++
              return dispatcher
            }(), interval) //setInterval time here
          } else {
            userEmailRequests(Usernames)
              .then(status => {
                console.log('////////////////////////finished getting user mails //////////////////////////\n', status, 'interval = ', interval)
              })
              .catch((count) => {
                console.log('count=', count)
              })
          }
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

let repoName = 'request/request' //facebook/react'
let watchers = 'Watchers.txt',
  stargazers = 'StarGazers.txt'
let fileName = repoName + '/' + repoName.split('/')[1] + stargazers

///////// use functions here ///////////////
prepare(repoName)
// scheduleGetEmailRequest(fileName)
// test()