module.exports = {

    getStarGazers: function (pageNumber) {
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
    },

    getStarGazersData: function (info) {

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

    },

}