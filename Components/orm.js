import {Db, DataTypes, Op} from './config/database';
import EventEmitter from 'events';
// Here we setup the user and company object relational maps
import User from './models/user';
import Form from './models/form';
import FormShard from './models/form_shard';
import Company from './models/company';

export default class Orm extends EventEmitter{
    constructor ({purge = false}) {

        super();
        return new Promise((resolve) => {
            Db().then((db) => { // after setting up db config define the table schemas (user, company and shards)
                this._db = db;

                this._user = User(this._db, DataTypes);
                this._company = Company(this._db, DataTypes);
                this._shards = this.createShardTables(1993, 2021);
            }).finally(() => {
                this._db.authenticate().then(async() => {
                    await this._db.sync({force: purge}); // npm start import will set purge param to true, forcing DB to recreate all tables 
                    console.log('Database connected...')
                    resolve(this);
                }).catch(err => {
                    console.log('Error: ' + err);
                    process.exit(1);
                })
            })
            
            
            this.resolvers = {
                Query: this.query(),
                Mutation: this.mutation()
            }
        });
    }


    // shardKeys are created using the date range of 1993, 2021
    createShardTables(startIndex, endIndex) {
        const shardDictionary = [];
        for(let i = startIndex; i < endIndex+1; i++) {
            let shardKey = i.toString();
            let shard = FormShard(this._db, DataTypes, shardKey); // this object defines new shardTable and is used to query the table
            shardDictionary[shardKey] = shard;
        }
        
        return shardDictionary;
    }

    bulkInsertIntoShard(data, shardKey) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = this._db.transaction((t) => {
                    return this._shards[shardKey].bulkCreate(data,{
                        returning: false,
                        ignoreDuplicates: true,
                        transaction: t
                    });
                });
                resolve(transaction);
            } catch(e) {
                reject(e);
            }
        });
    }
    bulkInsertCompany(companyData) {
        return new Promise ((resolve, reject) => {
            const transaction = this._db.transaction((t) => {
                return this._company.bulkCreate(companyData, {
                    returning: false,
                    // individualHooks: true,
                    ignoreDuplicates: true,
                    transaction: t
                })
            })
            resolve(transaction);
        });
    }

    createUser(userData) {
        let {name, email, vendor} = userData;
        this._db.transaction((t) => {
            return this._user.findOrCreate({
                where: {
                    name,
                    email,
                    vendor
                },
                transaction: t
            });
        }).then((user, created) => {

        }).catch((e) => {

        })
    }

    query() {
        return {

        }
    }

    mutation() {
        return {
            async upsertCompanyForms(root, {input}) {
                return await this.addCompanyForms(input);
            }
        }
    }

}