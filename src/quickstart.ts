// Foxify repo : https://github.com/foxify-trade/options-sdk
// Current version : v1.2
// Foxify swagger : 

// To run this demo : 
// 1. Create a .env file with your private key: PK='your_private_key'
// 2. yarn ts-node quickstart.ts

// IMPORTANT NOTES  :
// Code of the sdk in : node_modules/@foxify.trade/options-sdk/dist/
// important functions are in : 
// options-sdk/dist/contracts/Core/web3.d.ts
// options-sdk/dist/api/api.module.d.ts

// Smart contract code : https://arbiscan.io/address/0xec301D5a4ee80DF21E243E5490d29d44B83c27fC#code
// TIPS 
// To check databaseOrderId 37387 on the GUI, go to page: https://www.beta.foxify.trade/order/37387
// Current bug : the id referencing an order is different depending on the modules from which the function is called : 
//   -for all functions called from sdk.api : "myOrder.id" (i.e. database id, accessible through "getDatabaseId(blockchainId)"
//   -for all functions called from sdk.contracts : "myOrder.orderId" (i.e. blockchain id), accessible through "getBlockchainId(databaseId)"

// BUGS :
// orderCount seems wrong (20 != 17) :

// TODO : 
// Separate library
// test acceptOrders

import assert from 'assert';
import { OptionsSdk } from '@foxify.trade/options-sdk';
require('dotenv').config();

// FIXME
// import {OrderStatus, OrderType} from '../lib/foxify';
// import {getOrders} from '../lib/foxify';

assert(process.env.PK, 'Set your private key in .env');


const sdk = new OptionsSdk({
	contracts: {
		privateKey: process.env.PK,
	},
});


async function main() {

	const [oracle] = await sdk.api.getOracles();
	let doTestOrderId = true;
	let doLargeAmountPreapproval = false;
	let doGetPriceFeed = false; // ok
	let doGetMyActiveAndInactiveOrders = false; // Give a list of active and inactive orders belonging to us (maybe buggy)
	let doGetMyActiveOrders = true; // Give a list of our own orders
	let doGetMarketActiveOrders = false; // Give a list of orders in the market which are not our own

	let doGetPositions = true; // get our current positions
	let doCreateOrder = false;
	let doIncreaseOrder = false; // Ok but does not display on the GUI for 0.5% (it does for 1%)
	let doCancelOrder = false;
	let doDecreaseOrder = false; // ok

	let doAcceptOrder = false;

    // For one of our order, test the functions getBlockchainId() and getDatabaseId() with
	// myOrder.id and myOrder.orderId. 
	if (doTestOrderId) {
		let  databaseId = 39860; // Replace with your own myOrder.id : make sure this order is a pending order of ours
		let  blockchainId = 649; // Replace with your own myOrder.orderId

		const orderType: OrderType = "mine"; // "mine" | "others"
		const blockchainIdOutput = await getBlockchainId(databaseId, orderType);
		const databaseIdOutput = await getDatabaseId(blockchainId, orderType);
		console.log(`databaseId = ${databaseId} / blockchainId = ${blockchainId}`);
		console.log(`databaseIdOutput = ${databaseIdOutput} / blockchainIdOutput = ${blockchainIdOutput}`);
		assert (blockchainId === blockchainIdOutput, `doTestOrderId failed : blockchainId != blockchainIdOutput`);
		assert (databaseId === databaseIdOutput, `doTestOrderId failed : databaseId != databaseIdOutput`);
	}

	// Preapproving a large amount upfront saves on approve txfees whcih are are around 28 USD cents per approval as of August 2023.
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
			console.log(`humanReadableOrders : ${JSON.stringify(await displayOrder(myActiveAndInactiveOrders[i]), null, 2)}`);
		}
		assert (Number(myActiveAndInactiveOrderCount) === myActiveAndInactiveOrders.length, `Problem  in doGetActiveAndInactiveOrders : method sdk.contracts.core.methods.createorOrdersCount is incorrect (${myActiveAndInactiveOrderCount} != ${myActiveAndInactiveOrders.length})`);
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
			console.log(`humanReadableOrders : ${JSON.stringify(await displayOrder(myActiveOrders[i]), null, 2)}`);
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
			console.log(`humanReadableOrders : ${JSON.stringify(await displayOrder(marketActiveOrders[i]), null, 2)}`);
		}
	    // FIXME : fail
	}
	if (doGetPositions) {
		const { data: positions } = await sdk.api.raw.positions.positionControllerGetPositions(sdk.contracts.sender);
		console.log(`Our current positions : ${JSON.stringify(positions, null, 2)} `);
	}

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

	// IMPORTANT : for the moment, there is a current bug : there are two different ids to reference an order, depending from the function that is used : 
        // For all functions requiring an order Id, if functions  are coming from :
		// "sdk.api.xxx.ts" : use "myOrder.id" (internally, it is the database id : use "getDatabaseId()" function): this is the one on the GUI here : to check databaseOrderId 37387 on the GUI, go to page: https://www.beta.foxify.trade/order/37387
		// "sdk.contracts.xxx.ts" : use "myOrder.orderId" (internally, it is the blockchain id : use "getBlockchainId() function")
	
	// Lift an offer at market (or later, hit a bid. Resting orders on the bid are not allowed yet). 
	if (doAcceptOrder) {
		let  databaseId = 41021; // FIXME : TRY TO HIT IT myOrder.id
	    // "sdk.api.xxx.ts" : use "myOrder.id" (internally, it is the database id : use "getDatabaseId()" function)
		// "sdk.contracts.xxx.ts" : use "myOrder.orderId" (internally, it is the blockchain id : use "getBlockchainId() function")
		const orderType: OrderType = "others"; // FIXME : is it really "others" ??? "mine" | "others"
		let blockchainId = await getBlockchainId (databaseId, orderType);
		const amount = 3; // USDC
		await sdk.contracts.acceptOrders([{orderId : blockchainId, amount : amount }]); // function "acceptOrders" is used in sdk.contracts, therefore we take the blokchainId

		const order = await sdk.api.getOrder(databaseId);
		console.log(`order ${JSON.stringify(order, null, 2)}  was accepted with amount of ${amount} USDC`);
		console.log(`blockchainId/databaseId ${blockchainId}/${databaseId} was traded at market with amount of ${amount} USDC`);
	}

	if (doIncreaseOrder) {
		let  databaseId = 41021; // myOrder.id
		// "sdk.api.xxx.ts" : use "myOrder.id" (internally, it is the database id : use "getDatabaseId()" function)
		// "sdk.contracts.xxx.ts" : use "myOrder.orderId" (internally, it is the blockchain id : use "getBlockchainId() function")
		const orderType: OrderType = "mine"; 
		const blockchainId = await getBlockchainId(databaseId, orderType);
		const diffAmount = 3;
		await sdk.contracts.increaseOrderAmount(blockchainId, diffAmount);
		console.log(`blockchainId/databaseId ${blockchainId}/${databaseId}  was increased by ${diffAmount} USDC`);
	}

	if (doCancelOrder) {
		let  databaseId = 37189; // 41021; // myOrder.id
		const orderType: OrderType = "mine"; 
		const blockchainId = await getBlockchainId(databaseId, orderType);
		await sdk.contracts.closeOrder(blockchainId); // "closeOrder() belongs to sdk.contrats, we have to user the blockchainId
		console.log(`blockchainId/databaseId ${blockchainId}/${databaseId} was cancelled !`);
	}

	if (doDecreaseOrder) {
		let  databaseId = 41021; // myOrder.id
		const orderType: OrderType = "mine"; 
		const blockchainId = await getBlockchainId(databaseId, orderType);
		
		const order = await sdk.api.getOrder(databaseId);
		const diffAmount = Number(order.available) / 1e6;
		console.log(`blockchainId #${blockchainId}/databaseId #${databaseId} has an available amount of ${diffAmount} USDC`);
		await sdk.contracts.decreaseOrderAmount(blockchainId, diffAmount);
		console.log(`blockchainId #${blockchainId}/databaseId #${databaseId} was decreased by available ${diffAmount} USDC`);
	}
/*
	if (doGetOrdersFinish) {
		const orderStatus: OrderStatus = "active"; // "active" | "inactive" | "activeAndInactive";
		const orderType: OrderType = "mine"; // "mine" | "others"
		const orders = await getOrders(orderStatus, orderType);

		console.log(`FINISH : There are ${orders.length} orders `);
		for (let i = 0; i < orders.length; i++) {
			// console.log(`FINISH : nonHumanReadableOrders : ${JSON.stringify(await orders[i],null,2)}`); 
			console.log(`FINISH : humanReadableOrders : ${JSON.stringify(await displayOrder(orders[i]), null, 2)}`);
		}	
	}
*/
}

// THIS  BELOW SHOULD BE IN A LIBRARY

 type OrderStatus = "active" | "inactive" | "activeAndInactive";
 type OrderType = "mine" | "others";

function createOrderParameters(orderStatus: OrderStatus, orderType: OrderType) {
	// orderParams is of Type IGetOrderParams :
	let orderParams = {};
    const defaultLimit = 1000; // Pagination parameter

	if (orderStatus === "active" && orderType === "mine") {
		let myStatus = false;
		const orderType = 'my_order';

		orderParams = {
			account: sdk.contracts.sender,
			closed: myStatus, // false,
			orderType: orderType, // 'my_order' as const,  // all_order : takes all market orders EXCEPT MINE  | my_order : retrieves all orders which are mine
			limit: defaultLimit 
		}
	} else if (orderStatus === "inactive" && orderType === "mine") {
		let myStatus = true;
		const orderType = 'my_order';

		orderParams = {
			account: sdk.contracts.sender,
			closed: myStatus,
			orderType: orderType,  // all_order : takes all market orders EXCEPT MINE  | my_order : retrieves all orders which are mine
			limit: defaultLimit  
		}

	} else if (orderStatus === "activeAndInactive" && orderType === "mine") {
		const orderType = 'my_order';

		orderParams = {
			account: sdk.contracts.sender,
			orderType: orderType,
			limit: defaultLimit 
		}
	} else if (orderStatus === "active" && orderType === "others") {
		let myStatus = false;
		const orderType = 'all_order';

		orderParams = {
			account: sdk.contracts.sender,
			closed: myStatus,
			orderType: orderType,
			limit: defaultLimit
		}
	} else if (orderStatus === "inactive" && orderType === "others") {
		let myStatus = true;
		const orderType = 'all_order';

		orderParams = {
			account: sdk.contracts.sender,
			closed: myStatus,
			orderType: orderType,
			limit: defaultLimit
		}
	} else if (orderStatus === "activeAndInactive" && orderType === "others") {

		const orderType = 'all_order';

		orderParams = {
			account: sdk.contracts.sender,
			orderType: orderType,
			limit: defaultLimit
	}
}

	return orderParams;
}

// For now, there are two independent ways to reference orders : 
// Get a databaseId ("myOrder.id")
async function getDatabaseId(blockchainId: number, orderType : OrderType) {
	const orderStatus = "active";
	const orderParams = createOrderParameters(orderStatus, orderType);
	const orders = await sdk.api.getOrders(orderParams);
	const filteredOrders = orders.filter((order) => order.orderId === blockchainId);
	// console.log (`getDatabaseId : filteredOrders = ${JSON.stringify(filteredOrders,null,2)}`);
	const databaseId = filteredOrders[0]?.id;
	return databaseId;
}


// Get a blockchainId ("myOrder.orderId")
async function getBlockchainId(databaseId: number, orderType : OrderType) {
	const orderStatus = "active";
	const orderParams = createOrderParameters(orderStatus, orderType);
	const orders = await sdk.api.getOrders(orderParams);
	const filteredOrder = orders.filter((order) => order.id === databaseId);

	const blockchainId =  filteredOrder[0]?.orderId;
	return blockchainId;
}

async function getOrders(orderStatus: OrderStatus, orderType: OrderType) {
	const orderParams = createOrderParameters(orderStatus, orderType);
	const orders = await sdk.api.getOrders(orderParams);
	const nonNullOrders = orders.filter((order) => BigInt(order.available) > 0n);
	return nonNullOrders;
}

async function displayOrder(order: any) {
	// Structure of an order
	/*
	   {
	   "id": 41641,
	   "orderId": 685,
	   "creator": "0x9e4f715734712c0902b077363ad522422d5d3ff9",
	   "amount": "25900000",
	   "reserved": "0",
	   "available": "25900000",
	   "percent": "1000000100000000000",
	   "direction": "up",
	   "rate": "810000000000000000",
	   "duration": "900",
	   "reinvest": false,
	   "oracle": {
	   "id": 20734,
	   "name": "BTC/USD",
	   "address": "0x0015d0ab0e5ac1f31f8c40fcf9844797feeb1b09",
	   "priceId": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
	   "decimals": "18"
	   },
	   "orderStats": {
	   "countWon": 2,
	   "countLost": 1,
	   "lostSum": "8100000",
	   "wonSum": "29382716"
	   }
	   }
	 */

	const divisor = 10e10;

	const latestOraclePx = await sdk.priceFeed.getLatestPrice(order.oracle.address);
	const humanReadableOrder = {
		"oracle": order.oracle.name, /* {
						"id": 20734,
						"name": "BTC/USD",
						"address": "0x0015d0ab0e5ac1f31f8c40fcf9844797feeb1b09", "priceId": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
						"decimals": "18"
						},

					      */
		"oraclePx": latestOraclePx,
		"id": order.id,
		"orderId": order.orderId,
		"creator": order.createor,
		"amount": Number(order.amount / 1e6),
		"reserved": Number(order.reserved) / 1e6,
		"available": Number(order.available) / 1e6, 
		"percent": Number(order.percent) / 1e6 / divisor * 10,
		"direction": order.direction,
		"rate": Number(order.rate) / 1e6 / divisor,
		"duration": Number(order.duration),
		"reinvest": order.reinvest

		
		/*
		   "orderStats": {
		   "countWon": order?.orderStats?.countWon,
		   "countLost": order?.orderStats?.countLost,
		   "lostsum": Number(order?.orderStats?.lostSum)/1e6,
		   "wonsum": Number(order?.orderStats?.wonSum)/1e6,
		   }
		 */
		/*
		   "orderStats": {
		   "countWon": 2,
		   "countLost": 1,
		   "lostSum": "8100000",
		   "wonSum": "29382716"
		   }
		 */
	}
	return humanReadableOrder
}

main();
