import {Db, DataTypes, Op} from './config/database';
import EventEmitter from 'events';
// Here we setup the user and company object relational maps
import User from './models/user';
import Form from './models/form';
import Company from './models/company';

export default class Orm extends EventEmitter{
    constructor () {
        super();
        return new Promise((resolve) => {
            Db().then((db) => {
                this._db = db;
                this._user = User(this._db, DataTypes);
                this._company = Company(this._db, DataTypes);
                this._form = Form(this._db, DataTypes);
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