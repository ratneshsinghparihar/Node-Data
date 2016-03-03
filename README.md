###What is Node-Data

Node-Data is a Node.js framework to expose rest data on level 3 (metadata and auto discovery).

This framework will allow declarative style (annotations) to handle most of backend concerns (data relations, transactions, rest, graphql , security) .Yes its on javascript .

The target consumers are nodejs based scale projects looking for rewrite/new.

When you write for scale you might missed important aspect which might give you headache if you add the aspect late in your project. Node-Data will have most of aspects required in modern web scale project which can be enabled anytime using only annotations.

Rest level 3 is an amazing protocol allows the autodiscovery of system and application developers can write infrastructure for their code if backend api is level 3.

#What backend concerns will be handled

1 Rest level 3 APIs

2 Model driven system
  
3 Data repositories(Only interface)
  
4 Auto rest end point generations from repositories
  
5 Relations using annotations (one to one , onetomany , manytoone , manyttomany)
  
6 Embedded relations support (replication)
  
7 Transaction and services using annotations
  
8 DI container
  
9 Caching second level
  
10  Search and count (inbuilt elastic search)(repository and query dsl)
  
11  Logging and auditing using annotations
  
12 Graphql support
  
13  Meta-data API
  
14  Security (inbuilt authentication) ,role based autherization , acl

15 Everythingh is promise (no callback hell)