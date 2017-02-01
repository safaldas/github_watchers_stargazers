//////////////////////////////
//  Watchers are the subscribers 
//////////////////////////// 

module.exports = {



    getWatchersData: function (info) {

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

}

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