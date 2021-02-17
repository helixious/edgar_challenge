import {Db, DataTypes, Op} from './config/database';
import EventEmitter from 'events';
// Here we setup the user and company object relational maps
import FormShard from './models/form_shard';
import Company from './models/company';


const Model = {
    Company: Company(Db, DataTypes)
}



// Schema type definitions
import typeDefs from './schema/schema';

export default class Orm extends EventEmitter{
    constructor (purge) {
        super();
        this.typeDefs = typeDefs;
        this.resolvers = {
            Query: this.query(),
            // Mutation: this.mutation()
        }
        Db.authenticate().then(async () => {
            Db.sync({ force: purge }); // npm start import will set purge param to true, forcing DB to recreate all tables 
            console.log('Database connected...')
        }).catch(err => {
            console.log('Error: ' + err);
            process.exit(1);
        })
        Model.Shards = this.defineShardTables(1993, 2021);
    }

    // shardKeys are created using the date range of 1993, 2021
    defineShardTables(startIndex, endIndex) {
        const shardDictionary = [];
        for(let i = startIndex; i < endIndex+1; i++) {
            let shardKey = i.toString();
            let shard = FormShard(Db, DataTypes, shardKey); // this object defines new shardTable and is used to query the table
            shardDictionary[shardKey] = shard;
        }
        
        return shardDictionary;
    }

    bulkInsertIntoShard(data, shardKey) {
        return new Promise((resolve, reject) => {
            try {
                const transaction = Db.transaction((t) => {
                    return Model.Shards[shardKey].bulkCreate(data,{
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
            const transaction = Db.transaction((t) => {
                return Model.Company.bulkCreate(companyData, {
                    returning: false,
                    // individualHooks: true,
                    ignoreDuplicates: true,
                    transaction: t
                })
            })
            resolve(transaction);
        });
    }

    query() {
        return {
            async getCompanyByTicker(root, {ticker}) {
                const company = await Model.Company.findOne({
                    where: {
                        ticker
                    }
                });
                console.log(company);
                return company;
            },
            async getListingByCik(root, {cik}) {
                let shardKeys = Object.keys(Model.Shards);
                let results = [];

                for(let i = 0; i < shardKeys.length; i++) {
                    let shardKey = shardKeys[i];
                    await Model.Shards[shardKey].findAll({
                        where: {
                            cik
                        }
                    }).then((data) => {
                        for(let d of data) results.push(d);
                    })
                }
                return results;
            }
        }
    }

    mutation() {
        return {
            // to be populated with any Create or Update functions
        }
    }

}