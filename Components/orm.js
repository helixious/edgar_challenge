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
        this.shards = {};
        return new Promise((resolve) => {
            Db().then((db) => {
                this._db = db;
                this._user = User(this._db, DataTypes);
                this._company = Company(this._db, DataTypes);
                this._form = Form(this._db, DataTypes);
                // this.shards['1933'] = FormShard(this._db, DataTypes, '1993');
                this.createShardTables(1993, 2021);
            }).finally(() => {
                this._db.authenticate().then(async() => {
                    // await this._db.sync({force: true});
                    await this._db.sync();
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
        for(let i = startIndex; i < endIndex+1; i++) {
            let shardKey = i.toString();
            let shard = FormShard(this._db, DataTypes, shardKey);
            this.shards[shardKey] = shard;
        }        
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

    addCompanyForms(companyData) {
        return new Promise((resolve, reject) => {
            try {
                let {cik, companyName, forms} = companyData;
                this._db.transaction((t) => {
                    return this._company.findOrCreate({
                        where: {
                            id: cik,
                            name: companyName
                        },
                        returning: false,
                        ignoreDuplicates: true,
                        transaction: t
                    })
                }).then(() => {
                    
                }).catch((e) => {
                    // console.log(e);
                }).finally(() => {
                    this._form.bulkCreate(forms, {
                        // fields: ["fileName"],
                        // updateOnDuplicate:["fileName"]
                        // returning: true,
                        returning: false,
                        ignoreDuplicates: true
                    }).then(() => resolve())
                    .catch((e) => reject(e));
                })
            } catch(e) {
                reject(e);
            }
        })
        
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