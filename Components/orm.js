import {Db, DataTypes, Op} from './config/database';
import EventEmitter from 'events';
// Here we setup the user and company object relational maps
import User from './models/user';
import Form from './models/form';
import FormShard from './models/form_shard';
import Company from './models/company';

export default class Orm extends EventEmitter{
    constructor () {
        super();
        return new Promise((resolve) => {
            Db().then((db) => {
                this._db = db;
                this._user = User(this._db, DataTypes);
                this._company = Company(this._db, DataTypes);
                // this._form = Form(this._db, DataTypes);
                this._shards = this.createShardTables(1993, 2021);
            }).finally(() => {
                this._db.authenticate().then(async() => {
                    await this._db.sync({force: true});
                    // await this._db.sync();
                    console.log('Database connected...')
                    this.emit('ready')
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

    createShardTables(startIndex, endIndex) {
        const shardDictionary = [];
        for(let i = startIndex; i < endIndex+1; i++) {
            let shardKey = i.toString();
            let shard = FormShard(this._db, DataTypes, shardKey);
            shardDictionary[shardKey] = shard;
        }
        
        return shardDictionary;
    }

    async createNewTable(tableName) {
        try {
            await this._db.define(tableName,
                {
                    id: {
                        primaryKey: true,
                        type: DataTypes.INTEGER,
                        allowNull: false,
                        unique: true,
                        autoIncrement: true,
                        field: 'form_id'
                    },
                    cik: {
                        primaryKey: false,
                        type: DataTypes.INTEGER,
                        references: {
                            model: 'company',
                            key: 'cik',
                        }
                    },
                    formType: {
                        type: DataTypes.STRING,
                        unique: false,
                        allowNull: false
                    },
                    dateFiled: {
                        type: DataTypes.STRING,
                        allowNull: false,
                        unique: false
                    },
                    fileName: {
                        type: DataTypes.STRING,
                        allowNull: false,
                        // unique: true
                    }
                });
        } catch (e) {
            console.log(e);
        }
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