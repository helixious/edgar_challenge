export default (sequelize, DataTypes, shardName) => {
    return sequelize.define(shardName, {
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
    },
    {
        freezeTableName: true
    });
}