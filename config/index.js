var colors = require('colors');

module.exports = {
    environment: process.env.NODE_ENV || 'production',
    databases: {
        production: 'mongodb://higea-api:LovelyConsistNameCompletely@104.237.155.175:27017/higea?authSource=user-data',
        development: 'mongodb://172.10.10.200:27017/higea-api'//'mongodb://nodefe:290rh06p@104.237.155.78:27017/nodefe?authSource=user-data'
    },
    tokenSecret: "BeltGasPrepareFence",
    rcSecret: "6LcRkCAUAAAAAM6sRJ3yZWk9eediAnBZsWqu3ZKG",
    loggerFormat: {
        format: [
            "{{timestamp}} <{{title}}> {{path}}:{{line}} ({{method}})\n{{message}}",
            {
                info: "{{timestamp}} <{{title}}> {{path}}:{{line}} ({{method}})\n{{message}}",
                warn: "{{timestamp}} <{{title}}> {{path}}:{{line}} ({{method}})\n{{message}}",
                error: "{{timestamp}} <{{title}}> {{path}}:{{line}} ({{method}})\n{{message}}",
                debug: "{{timestamp}} <{{title}}> {{path}}:{{line}} ({{method}})\n{{message}}",
                log: "{{timestamp}} <{{title}}> {{file}}:{{line}} ({{method}}) {{message}}"
            }
        ],
        filters: [{
            info: [colors.green, colors.bold],
            warn: [colors.yellow, colors.bold],
            error: [colors.red, colors.bold],
            debug: [colors.cyan, colors.bold],
            log: [colors.white, colors.bold]
        }],
        dateformat: "yyyy-mm-dd HH:MM:ss.L"
    }
}