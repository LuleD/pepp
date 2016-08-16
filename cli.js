"use strict";

if(process.env.NODE_ENV === undefined) {
    console.error("\nPlease specify a config file by setting the NODE_ENV enviroment variable. For example:\n");
    console.error((process.platform.toLowerCase().includes('win') ? "set NODE_ENV=demo\n\n" : "export NODE_ENV=demo\n\n"));
    process.exit(1);
}

const _ = require('underscore');
const figlet = require('figlet');
const config = require('config');

const taskManager = require('./lib/taskManager');
const queue = require('./lib/queue');
const log = require("./lib/helpers/logger");
const cacheHelper = require('./lib/helpers/cache');
const format = require('./lib/format');
const baseline = require('./lib/baseline');
const file = require('./lib/file');
const requestFactory = require("./lib/requestFactory").requestFactory;

log.info(figlet.textSync(process.env.NODE_ENV));
console.log("\n\n");


exports.run = function run(configObject={}) {

    const normalizedTasks = taskManager.loadConfigTasks(configObject);

    normalizedTasks.forEach(task => {

        const reqObj = requestFactory(task, configObject.index, configObject.start, configObject.end);

        queue.queueRequest(reqObj, task, configObject.index, configObject.start, configObject.end)
            .then(response => {

                //handle expected unresolved promises caused by recursion
                if(response === undefined || _.isEmpty(response)){
                    return reject();
                }

                cacheHelper.debugAll();

                return response;
            })
            .then(response => {

                if(reqObj.name.includes('baseline')) {
                    return baseline.gen(response, reqObj);
                } else {
                    return format.jsonToCsv(response);
                }

            })
            .then(response => {
                return file.write(reqObj.name, response);
            })
            .then(response => {

                if(_.isObject(response)){
                    log.info(JSON.stringify(response, undefined, 4));
                }

                if(_.isString(response)){
                    log.info(response);
                }
                console.log("\n");

            })
            .catch(err => {
                if(err.response.body){
                    log.error(err.response.body);
                } else {
                    log.error(JSON.stringify(err, undefined, 4));
                }
                process.exit(1);
            });
    });

};







