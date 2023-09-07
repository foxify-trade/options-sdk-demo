# Options SDK demo repository

INSTALLATION :  
Install Node.js (version >= 14)  
git clone git@github.com:foxify-trade/options-sdk-demo.git  
or if you have authentification issues : 
git clone https://github.com/foxify-trade/options-sdk-demo.git


cd options-sdk-demo  
yarn add @foxify.trade/options-sdk@1.2.0-beta.3  

STORE YOUR PRIVATE KEY in options-sdk-demo/.env:  
.env : PK='abcefg.....'  

RUN DEMO : READ THE DEMO AND CHANGE IT BEFORE RUNNING IT BECAUSE ORDERS WILL BE PLACED IN THE LIVE MARKET !
cd options-sdk-demo  
./run_quickstart.sh

This will run src/quickstart.ts which are a collection of generic routines that can be used as a foundation for a trading bot.
