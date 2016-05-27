import * as Sequelize from "sequelize";

export function castToSequelizeType(value, schemaType) {
    var newVal;
    switch (schemaType) {
        //case Sequelize.UUID:
        //    if (value instanceof Sequelize.UUID) {
        //        newVal = value;
        //    } else if (typeof value === 'string') {
        //        newVal = new Sequelize.UUID(value);
        //    } else {
        //        throw 'cannot cast to primary key type';
        //    }
        //    break;
        case String:
            if (typeof value === 'string') {
                newVal = value;
            }
            newVal = value.toString();
            break;
        case Number:
            if (typeof value === 'number') {
                newVal = value;
            }
            newVal = parseInt(value);
            if (isNaN(newVal)) {
                throw 'cannot cast to primary key type';
            }
            break;
        default: newVal = value; break;
    }
    return newVal;
}