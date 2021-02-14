import dotenv from 'dotenv';
dotenv.config({path:'../'});
const {Sequelize, DataTypes} = require('sequelize');

const sequelize = new Sequelize(
    process.env.POSTGRES_DB,
    process.env.POSTGRES_USERNAME,
    process.env.POSTGRES_PASSWORD, {
    dialect: 'postgres',
    host: process.env.POSTGRES_HOST
});

export {sequelize, DataTypes};