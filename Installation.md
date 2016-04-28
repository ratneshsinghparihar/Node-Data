

Setup
1) Install Nodejs - https://nodejs.org/en/download/current/ (5.7.0)
2) Install MongoDb - https://www.mongodb.org/downloads#production (3.2)
3) Run mongodb
	> Create 'c:\data' Folder
	> Goto 'C:\Program Files\MongoDB\Server\3.2\bin' and start 'mongod.exe'
4) Install RoboMongo - https://robomongo.org/download (0.9.0 RC7)
5) Start RoboMongo and connect to 'localhost:27017'
6) Install postman - http://www.getpostman.com/
7) open command prompt at root directory
	> run 'npm install'
	> run 'tsd install'

Compile
1) using gulp
	> open command prompt at root directory	
	> run 'gulp compile-ts'
2) using visual studio
	> Configure visual studio as explained below***
	> Compile the project

Run
1) using gulp
	> open command prompt at root directory	
	> run 'gulp compile-ts'
2) using visual studio
	> Configure visual studio as explained below
	> Run the project


***Steps for Configuring visual studio
1) Install Visual Studio 2015 Community - https://www.visualstudio.com/en-us/downloads/download-visual-studio-vs.aspx
2) Install Nodejs for Visual Studio 2015 - https://www.visualstudio.com/en-us/features/node-js-vs.aspx
3) Install Typescript for Visual Studio 2015 - https://visualstudiogallery.msdn.microsoft.com/418d1f01-e58c-453a-a7d0-8381b562d499
4) Open Tools->Options
	- Disable intellisence of Nodejs
		> Select TextEditor->Nodejs->Intellisense
		> Select 'No Intellisense'
	- Enable auto compiling of Typescript
		> Select TextEditor->Typescript->Project
		> Select 'Auto Compile Typescript' and 'Use AMD'
	Apply the changes
5) Restart visual studio

Troubleshoot (if compiling the visual studio project fails)
Replace npm to %appdata%
- goto 'C:\Program Files\nodejs'
- copy 'npm' and 'npm.cmd' and replace at '%appdata%/npm'
- goto 'C:\Program Files\nodejs\node_modules'
- copy 'npm' folder and replace at '%appdata%/npm/node_modules'
- restart visual studio