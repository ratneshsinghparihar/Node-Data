##What is Node-Data

Node-Data is a Node.js framework to expose rest data on level 3 (metadata and auto discovery).

This framework will allow declarative style (annotations) to handle most of backend concerns (data relations, transactions, rest, graphql , security) .Yes its on javascript .

The target consumers are nodejs based scale projects looking for rewrite/new.

When you write for scale you might missed important aspect which might give you headache if you add the aspect late in your project. Node-Data will have most of aspects required in modern web scale project which can be enabled anytime using only annotations.

Rest level 3 is an amazing protocol allows the autodiscovery of system and application developers can write infrastructure for their code if backend api is level 3.

##What backend concerns will be handled

1. Rest level 3 APIs

2. Model driven system
 
3. Data repositories(Only interface)
 
4. Auto rest end point generations from repositories
 
5. Relations using annotations (one to one , onetomany , manytoone , manyttomany)
 
6. Embedded relations support (replication)

7. Transaction and services using annotations

8. DI container

9. Caching second level
  
10.  Search and count (inbuilt elastic search)(repository and query dsl)
  
11.  Logging and auditing using annotations
  
12. Graphql support
  
13.  Meta-data API
  
14.  Security (inbuilt authentication) ,role based autherization , acl

15. Everythingh is promise (no callback hell)


##Technologies used 

library |  version |  Comment/alternative
------------ | ------------- | -------------
nodejs |  5.7.0 | node
express | 4.13.3 | Rest middleware
TypeScript | 1.8.4 | Rest middleware
monogdb | 2.1.3 | Rest middleware
Mongoose | 4.3.5 | Rest middleware
Metadata-reflect | 0.1.3 | Rest middleware
gulp | 3.9.0 | Rest middleware
passport | 0.2.2 | Rest middleware
Npm-acl | 0.4.9 | Rest middleware
Elastic search | 10.1.3 | Rest middleware
Mongosastic | 4.0.2 | Rest middleware
redis | unknown | Rest middleware

##Rest level 3 APIs

Node-data exposes the entities as level 3 REST APIs in HAL format. 
Read more about: 
[HAL specification-](http://stateless.co/hal_specification.html) 
[Rest API levels-](http://martinfowler.com/articles/richardsonMaturityModel.html) 
 
In short, REST level 3 in addition to HTTP verbs(get, put, post etc.) introduces the concept of discoverability. 
When we navigate to the base-url(assuming base-url for API is "http://localhost:8080/data/") for API, we get all the exposed rest APIs in the system. 
```javascript
[ 
  { 
   "roles": "http://localhost:8080/data/roles" 
  }, 
  { 
   "users": "http://localhost:8080/data/users" 
  } 
] 
```
 
###Suppose we want to get all the users in the system, we go to: "http://localhost:8080/data/users". 
```javascript
{ 
  "_links": { 
   "self": { 
    "href": "http://localhost:8080/data/users" 
   }, 
   "search": { 
    "href": "/search" 
   } 
  }, 
  "_embedded": [ 
   { 
    "_id": "56d692a24043588c0c713564", 
    "email": "alex.b@xyz.com", 
    "name": "Alex Brown", 
    "_links": { 
     "self": { 
      "href": "http://localhost:8080/data/users/56d692a24043588c0c713564" 
     }, 
     "roles":{ 
      "href": "http://localhost:8080/data/users/56d692a24043588c0c713564/roles" 
     } 
    } 
   }, 
   { 
    "_id": "56d692be4043588c0c713565", 
    "email": "daniel.j@xyz.com", 
    "name": "Daniel Jones", 
    "_links": { 
     "self": { 
      "href": "http://localhost:8080/data/users/56d692be4043588c0c713565" 
     }, 
     "roles":{ 
      "href": "http://localhost:8080/data/users/56d692be4043588c0c713565/roles" 
     } 
    } 
   } 
  ] 
} 
```

If we want to fetch all the roles for any user, we can simply fetch the roles url from inside the "_links" object for the given user. We just need to know what the base URL is, and after that we just follow the links to get any entity, its relations and so on. 
