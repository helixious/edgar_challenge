// CIK|Company Name|Form Type|Date Filed|Filename;

export default (sequelize, DataTypes) => {
    return sequelize.define('company', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            unique: true,
            // autoIncrement: true,
            field: 'cik'
        },
        name: {
            type: DataTypes.STRING,
            unique: false,
            allowNull: false
        },

    },
    {
        tableName: 'company',
        classMethods: {
            associate: (models) => {
                models.Company.hasMany(models.Form, {
                    as: 'Forms',
                    foreignKey: 'cik',
                    otherKey: 'form_id'
                })
            }
        }
    }
    )
}