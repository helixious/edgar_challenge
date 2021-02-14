import {sequelize, DataTypes} from './config/database';
import EventEmitter from 'events';

// Here we setup the user and company object relational maps
import User from './models/user';
import Form from './models/form';
import Company from './models/company';

export default class Orm extends EventEmitter{
    constructor() {
        super();
        this._user = User(sequelize, DataTypes);
        this._company = Company(sequelize, DataTypes);
        this._form = Form(sequelize, DataTypes);
        
        this.resolvers = {
            Query: this.query(),
            Mutation: this.mutation()
        }

        sequelize.authenticate().then(async() => {
            await sequelize.sync({force: true});
            // await sequelize.sync();
            console.log('Database connected...')
            this.emit('ready')
        }).catch(err => {
            console.log('Error: ' + err);
            process.exit(1);
        });
    }

    addCompanyForms(companyData) {
        let {cik, name, forms} = companyData;
        sequelize.transaction((t) => {
            return this._company.findOrCreate({
                where: {
                    id:cik,
                    name
                },
                transaction: t
            })
        }).then(() => {
            this._form.bulkCreate(forms).then((result) => {
                return result
            }).catch((e) => {
                console.log(e);
            });
        }).catch((e) => {

        })
    }

    createUser(userData) {
        let {name, email, vendor} = userData;
        sequelize.transaction((t) => {
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

        }
    }

}