const {Sequelize, DataTypes, Op} = require('sequelize');

const {POSTGRES_HOST, POSTGRES_DB, POSTGRES_USERNAME, POSTGRES_PASSWORD} = process.env;

const Db = new Sequelize(
    POSTGRES_DB,
    POSTGRES_USERNAME,
    POSTGRES_PASSWORD,
    {
        host: POSTGRES_HOST,
        dialect: 'postgres',
        logging: false,
    }
);

module.exports = {Db, DataTypes, Op};