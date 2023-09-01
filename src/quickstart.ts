// Foxify repo of this demo : https://github.com/foxify-trade/options-sdk-demo
// Foxify repo of the option api SDK : https://github.com/foxify-trade/options-sdk
// Current version : v1.2.0-beta.3
//
// Foxify swagger : TBD

// To run this demo : 
// Be careful, there is some code that places orders and act on the markets. Make sure you modify your parameters properly.
// 0. Read INSTALL.txt to install everything
// 1. Create a .env file with your private key: PK='your_private_key'
// 2. ./run_quickstart.ts (or yarn ts-node quickstart.ts)
// 
// IMPORTANT NOTES  :
// Code of the sdk in : node_modules/@foxify.trade/options-sdk/dist/
// important functions are in : 
// options-sdk/dist/contracts/Core/web3.d.ts
// options-sdk/dist/api/api.module.d.ts
// Smart contract code : https://arbiscan.io/address/0xec301D5a4ee80DF21E243E5490d29d44B83c27fC#code
//
// TIPS :
// To check databaseOrderId #37387 on the GUI, go to page: https://www.beta.foxify.trade/order/37387 (the whole list of databaseorderId can be seen with doGetMarketActiveOrders = true)

// BUGS :
// orderCount seems wrong (20 != 17) 

// TODO : 
// getDatabaseId() and getBlockchainId() should be later on integrated within api
// Only databaseId should in later versions be used to reference orders

import assert from 'assert';
import { OptionsSdk } from '@foxify.trade/options-sdk';
require('dotenv').config();

import {
	createOrderParameters,
	getDatabaseId,
	getBlockchainId,
	getOrders,
	displayOrder,
	displayPosition,
	trade,
	increaseOrderAmount,
	withdrawAmount,
	cancelOrder
} from '../lib/foxify';

import { OrderStatus, OrderType } from '../lib/foxify';

assert(process.env.PK, 'Set your private key in .env');


const sdk = new OptionsSdk({
	contracts: {
		privateKey: process.env.PK,
	},
});


async function main() {

	const [oracle] = await sdk.api.getOracles();
	let doLargeAmountPreapproval = false;
	let doGetPriceFeed = false; // ok
	let doGetMyActiveAndInactiveOrders = false; // Give a list of active and inactive orders belonging to us (maybe buggy)
	let doGetMyActiveOrders = true; // Give a list of our own orders
	let doGetMarketActiveOrders = false; // Give a list of orders in the market which are not our own

	let doGetPositions = true; // get our current positions
	let doCreateOrder = false; // BE CAREFUL : this creates an order and  will actually place an order in the market
	let doIncreaseOrderAmount = false; // Fund more money into a bet 
	let doCancelOrder = false;
	let doWithdraw = false; // Withdraw money from  

	let doLiftPendingOrder = false; // BE CAREFUL : this trades at market
	let doTestOrderId = false;

	// Preapproving a large amount of USDC upfront at the beginning of the trading session 
	// saves on approve txfees which are around 28 USD cents depending on gas fees.
	// If you want to reestablish approval, set largePreapprovalAmount = 0;
	if (doLargeAmountPreapproval) {
		const largePreapprovalAmount = 1000000; // USDC
		await sdk.contracts.approve(largePreapprovalAmount);
	}

	// Get the Pyth oracles
	if (doGetPriceFeed) {
		// Example of oracle structure :
		/*
		   {
		   "id": 20734,
		   "createdAt": "2023-07-11T19:06:38.019Z",
		   "updatedAt": "2023-07-11T19:06:38.019Z",
		   "chainId": 42161,
		   "name": "BTC/USD",
		   "address": "0x0015d0ab0e5ac1f31f8c40fcf9844797feeb1b09",
		   "priceId": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
		   "decimals": "18"
		   }
		 */

		const [oracle] = await sdk.api.getOracles();

		console.log(`Pyth oracle id for ${oracle.name} (address=${oracle.address})`)
		const latest = await sdk.priceFeed.getLatestPrice(oracle.address);
		console.log('Latest Price Feeds', latest);
		sdk.priceFeed.subscribePriceUpdates(oracle.address, (price) => {
			console.log(`[${new Date().toISOString()}] New price feed received`, price);
		})

		console.log(`Available oracle: ${JSON.stringify(oracle, null, 2)}`);
		console.log(`Working on asset : ${oracle.name}`);
	}

	if (doGetMyActiveAndInactiveOrders) {
		const orderStatus: OrderStatus = "activeAndInactive"; // "active" | "inactive" | "activeAndInactive";
		const orderType: OrderType = "mine"; // "mine" | "others"
		const myActiveAndInactiveOrders = await getOrders(orderStatus, orderType);
		const myActiveAndInactiveOrderCount = await sdk.contracts.core.methods.creatorOrdersCount(sdk.contracts.sender).call();

		console.log(`myActiveAndInactiveOrderCount : ${myActiveAndInactiveOrderCount}`);
		console.log(`sender address: ${sdk.contracts.sender}`);
		console.log(`There are ${myActiveAndInactiveOrders.length} activeAndInactive orders`);

		// console.log (`Displaying orders in human friendly format`);
		for (let i = 0; i < myActiveAndInactiveOrders.length; i++) {
			console.log(`Orders : ${JSON.stringify(await displayOrder(myActiveAndInactiveOrders[i]), null, 2)}`);
		}
		// FIXME : this assert currently fails
		// assert (Number(myActiveAndInactiveOrderCount) === myActiveAndInactiveOrders.length, `Problem  in doGetActiveAndInactiveOrders : method sdk.contracts.core.methods.createorOrdersCount is incorrect (${myActiveAndInactiveOrderCount} != ${myActiveAndInactiveOrders.length})`);
	}

	// List the binary options pending in the market (which are ours)
	if (doGetMyActiveOrders) {
		const orderStatus: OrderStatus = "active"; // "active" | "inactive" | "activeAndInactive";
		const orderType: OrderType = "mine"; // "mine" | "others"
		const myActiveOrders = await getOrders(orderStatus, orderType);
		const myActiveOrderCount = await sdk.contracts.core.methods.creatorOrdersCount(sdk.contracts.sender).call();

		console.log(`myActiveOrderCount : ${myActiveOrderCount}`);
		console.log(`sender address: ${sdk.contracts.sender}`);
		console.log(`There are ${myActiveOrders.length} active orders belonging to me`);

		// console.log (`Displaying orders in human friendly format`);
		for (let i = 0; i < myActiveOrders.length; i++) {
			console.log(`Orders : ${JSON.stringify(await displayOrder(myActiveOrders[i]), null, 2)}`);
		}
		// assert (Number(myActiveOrderCount) === myActiveOrders.length, `Problem in doGetActiveOrders : method sdk.contracts.core.methods.createorOrdersCount is incorrect (${myActiveOrderCount} != ${myActiveOrders.length})`);
		// FIXME : fail
	}

	// List the binary options that in the market (which are not ours)
	if (doGetMarketActiveOrders) {
		const orderStatus: OrderStatus = "active"; // "active" | "inactive" | "activeAndInactive";
		const orderType: OrderType = "others"; // "mine" | "others"
		const marketActiveOrders = await getOrders(orderStatus, orderType);

		console.log(`There are ${marketActiveOrders.length} active orders not belonging to me`);

		// console.log (`Displaying orders in human friendly format`);
		for (let i = 0; i < marketActiveOrders.length; i++) {
			console.log(`Orders : ${JSON.stringify(await displayOrder(marketActiveOrders[i]), null, 2)}`);
		}
		// FIXME : fail
	}
	if (doGetPositions) {
		// const { data: positions } = await sdk.api.raw.positions.positionControllerGetPositions(sdk.contracts.sender);
		const { data: positions } = await sdk.api.raw.positions.positionControllerGetPositions(sdk.contracts.sender);

		for (let i = 0; i < positions.length; i++) {
			console.log(`Positions: ${JSON.stringify(await displayPosition(positions[i]), null, 2)}`);
		}
		// console.log(`Our current positions in raw format: ${JSON.stringify(positions, null, 2)} `);
	}

	/*
	 * ALL FOLLOWING INSTRUCTIONS PLACE REAL ORDERS IN THE MARKET !!!
	 * CHECK THE CODE AND PUT YOUR OWN PARAMETERS !
_;~)                  (~;_
(   |                  |   )
 ~', ',    ,''~'',   ,' ,'~
  ', ','       ',' ,'
      ',: {'} {'} :,'
        ;   /^\   ;
         ~\  ~  /~
       ,' ,~~~~~, ',
      ,' ,' ;~~~; ', ',
    ,' ,'    '''    ', ',
   (~  ;               ;  ~)
    -;_)               (_;-

*/
	// BE CAREFUL : this creates an order and  will actually place an order in the market
	if (doCreateOrder) {
		// Define the binary option :
		const direction = sdk.contracts.Direction.Up;
		const duration = '15m';
		const percent = 3.0;
		const rate = 1.31416; // For 1 USD, return 1.3146 USD if binary is in the money
		const amount = 13.5; // USD

		const { orderId } = await sdk.contracts.createOrder({
			direction: direction,
			duration: duration,
			oracle: oracle.address,
			percent: percent,
			rate: rate,
			amount: amount,
			reinvest: false
		});

		console.log(`orderId was created : orderId: #${orderId}\nDirection:${direction}\nDuration:${duration}\npercent:${percent}\nRate:${rate}\nAmount:${amount}`);
	}


	// WARNING : actual trade : lift a pending offer in the market (or later, hit a bid price. Resting orders on the bid are not allowed yet). 
	// To determine databaseId, you can scan the market bids and offers by setting "doGetMarketActiveOrders = true" in the code above.
	if (doLiftPendingOrder) {
		let databaseId = 21216; // FIXME : TRY TO HIT an offer or a bid with a given order.id 
		let amount = 4; // USDC	
		await trade(databaseId, amount);
	}

	// WARNING : actual size increase on one of our pending order 
	if (doIncreaseOrderAmount) {
		let databaseId = 41021; // myOrder.id
		const diffAmount = 3;
		await increaseOrderAmount(databaseId, diffAmount);
	}

	// WARNING : actual order cancellation on one of our pending order
	if (doCancelOrder) {
		let databaseId = 39860; // myOrder.id
		await cancelOrder(databaseId);
	}

	// WARNING : actual withdraw of capital on one of our pending order
	if (doWithdraw) {
		let databaseId = 41021; // myOrder.id
		let amount = 1.0; // USDC 
		await withdrawAmount(databaseId, amount);
	}


	// For one of our order, test the functions getBlockchainId() and getDatabaseId() with
	// myOrder.id and myOrder.orderId. 
	if (doTestOrderId) {
		let databaseId = 39860; // Replace with your own myOrder.id : make sure this order is a pending order of ours
		let blockchainId = 649; // Replace with your own myOrder.orderId

		const orderType: OrderType = "mine"; // "mine" | "others"
		const blockchainIdOutput = await getBlockchainId(databaseId, orderType);
		const databaseIdOutput = await getDatabaseId(blockchainId, orderType);
		console.log(`databaseId = ${databaseId} / blockchainId = ${blockchainId}`);
		console.log(`databaseIdOutput = ${databaseIdOutput} / blockchainIdOutput = ${blockchainIdOutput}`);
		assert(blockchainId === blockchainIdOutput, `doTestOrderId failed : blockchainId != blockchainIdOutput`);
		assert(databaseId === databaseIdOutput, `doTestOrderId failed : databaseId != databaseIdOutput`);
	}

}

main();
