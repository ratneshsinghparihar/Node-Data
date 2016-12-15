import { Decorators } from './core/constants/decorators';
import { DecoratorType } from './core/enums/decorator-type';
import { MetaUtils } from "./core/metadata/utils";
import {MetaData, IMetaOptions} from "./core/metadata/metadata" ;
import * as Enumerable from 'linq';

// console.log("Child Process " + process.argv[1] + " executed." );
process.on('message', function (m) {
    // Do work  (in this case just up-case the string
    //   m = m.toUpperCase();
    // Pass results back to parent process
    console.log("Message from parent: " + m.message);
    console.log("services length: "+m.service.length)
    process.send("Child Process" + process.argv[1] + " executed successfully ...");

    //let services = MetaUtils.getMetaDataForDecorators([Decorators.SERVICE]);
    let services= Array<{target: Object, metadata: MetaData[]}>(m.service);

    console.log("services : "+ m.service.length+ "service names: "+ services);
    var instanceService=Enumerable.from(services).where(x => x.metadata[0].params.serviceName == "InstanceService").select(x => x.metadata[0]).firstOrDefault();
    console.log("instanceService : "+ instanceService);

});