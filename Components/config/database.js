import { reject } from 'async';
import dotenv from 'dotenv';
dotenv.config({path:'../'});
const {Sequelize, DataTypes, Op} = require('sequelize');

const Db = () => {
    return new Promise((resolve, reject) => {
        try {
            const db = new Sequelize(
                process.env.POSTGRES_DB,
                process.env.POSTGRES_USERNAME,
                process.env.POSTGRES_PASSWORD,
                {
                    host: process.env.POSTGRES_HOST,
                    dialect: 'postgres',
                    logging: false,
                });
            resolve(db);
        } catch(e) {
            reject(e);
        }
    });
}

export {Db, DataTypes, Op};