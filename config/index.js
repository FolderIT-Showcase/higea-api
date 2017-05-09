var colors = require('colors');

module.exports = {
    environment: process.env.NODE_ENV || 'production',
    databases: {
        production: {
            Server: 'demo16',
            UserId: 'DBA',
            Password: 'sql'
        },
        development: {
            Server: 'demo16',
            UserId: 'DBA',
            Password: 'sql'
        }
    },
    tokenSecret: "BeltGasPrepareFence",
    rcSecret: 'reCAPTCHA secret (pendiente)',
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