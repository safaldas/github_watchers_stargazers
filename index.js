var request = require('request');
var readFile = require('./utils').readFile
var fs = require('fs')
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
      'Authorization': 'token 24d85c4e1f1e96ab6142b6a872c426a7464873bb'
    }
  };
}

//////////////////////////////
//  Watchers are the subscribers 
//////////////////////////// 


function getWatchers(pageNumber) {
  return new Promise((resolve, reject) => {
    let path = reposPath + `/subscribers?page=${pageNumber}&per_page=100`;

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


function getStarGazers(pageNumber) {
  return new Promise((resolve, reject) => {
    let path = reposPath + `/stargazers?page=${pageNumber}&per_page=100`;

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

function getWatchersData(info) {

  return new Promise((resolve, reject) => {

    //console.log(info)
    let watchers = info.subscribers_count;

    let totalPagesOfWatchers = Math.ceil(watchers / 100);
    let usersList = []
    let execCount = 0;
    for (let i = 1; i <= totalPagesOfWatchers; i++) {
      getWatchers(i).then(data => {
        usersList = usersList.concat(data)
        execCount++;
        console.log(execCount, totalPagesOfWatchers)
        if (execCount == totalPagesOfWatchers) {
          resolve(usersList)
        }
      }, err => {
        reject(err)
      })
    }


  })

}

function getStarGazersData(info) {

  return new Promise((resolve, reject) => {

    //console.log(info)
    let starGazers = info.stargazers_count;
    let totalPagesOfStargazers = Math.ceil(starGazers / 100);
    let usersList = []
    let execStarCount = 0;
    for (let i = 1; i <= totalPagesOfStargazers; i++) {
      getStarGazers(i).then(data => {
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
      ///////////////////////
      //  Watchers///
      //////////////////////
      getWatchersData(info).then(UserNames => {
        console.log('total Watchers : ' + UserNames.length)
        file = repoName + 'Watchers.txt'
        fs.writeFile(file, UserNames, (err) => {
          if (err) throw err;
          console.log('It\'s saved!');
        });


      }, err => {
        console.log(err);
      })
      ///////////////////
      /// starGazers
      /////////////////
      getStarGazersData(info).then(UserNames => {
        console.log('total StarGazers : ' + UserNames.length)
        file = repoName + 'StarGazers.txt'
        fs.writeFile(file, UserNames, (err) => {
          if (err) throw err;
          console.log('It\'s saved!');
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
function getUserEmail(Usernames) {
  return new Promise((resolve, reject) => {
    let count = 1,
      requestCount = 1 //since usernames length is 1 greater i think needs checking
    console.log('Started requesting user Data..............\n')
    for (let i = 0; i < Usernames.length; i++) {
      request(options(usersPath + Usernames[i]), function (error, response, body) {
        let status = {},
          email
        status.requestRemaining = parseInt(response.caseless.dict['x-ratelimit-remaining']),
          status.nextTime = parseInt(response.caseless.dict['x-ratelimit-reset'])
        requestCount++
        let user = JSON.parse(body)
        email = user.email
        console.log("Got user ", user.login, email)
        if (email) {
          email = email + ','
          fs.appendFile('staremails.txt', email, (err) => { //  append to file for every returning
            if (err) {
              console.log('ERROR WRITING FILE\n')
              throw err;
            }
            console.log('It\'s saved!', count++);
          });
        }
        if (requestCount === Usernames.length) {
          resolve(status)
        }
      })

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
  test().then(data => {
    interval = data.nextTime - new Date().getUnixTime()
    readFile(fileName).then((Usernames) => { //read file and get usernames
      let totalUsers = Usernames.length,
        dispatchCount = 0,
        numberOfDispatches = Math.ceil(totalUsers / 5000); //get the number of times to schedule these  as 5000 per hour is only permitted

      if (numberOfDispatches > 2) {

        //call get email function numberOfDispatches times back to back        
        let intervalId = setInterval(function () {
          if (dispatchCount == numberOfDispatches) {
            clearInterval(intervalId)
          } else {
            let names = Usernames.slice(dispatchCount * 5000, dispatchCount * 5000 + 5000)
            getUserEmail(names).then(status => {
              console.log(status)
              interval = status.nextTime - new Date().getUnixTime()
            }).catch(error => {
              console.log(error)
            })
          }
          dispatchCount++
        }, interval) //setInterval time here
      } else {
        getUserEmail(Usernames).then(status => {
          console.log('////////////////////////finished getting user mails //////////////////////////\n', status, 'interval = ', interval)
        }).catch(error => {
          console.log(error)
        })
      }
    })
  }).catch(err => {
    console.log(err)
  })

}

///////// use functions here ///////////////
// test()
//getUserEmail()
var repoName = 'request/request' //facebook/react'
let watchers= 'Watchers.txt',
  stargazers = 'StarGazers.txt'
let fileName = repoName + watchers
findUsernames(repoName)
//scheduleGetEmailRequest(fileName)