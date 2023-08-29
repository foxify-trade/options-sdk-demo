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
// Check databaseOrderId 37387 on the GUI : https://www.beta.foxify.trade/order/37387
// Current bug : the id referencing an order is different depending on the modules from which the function is called : 
//   -for all functions called from sdk.api : id (i.e. database id)
//   -for all functions called from sdk.contracts : orderId (i.e. blockchain id)
 
// TODO Tuan : 
// Create a human readable format for binary options
// Create an equivalence function between databaseOrderId and blockchainOrderId
// Retrieve all orders from the market with non null amounts

import assert from 'assert';
import { OptionsSdk } from '@foxify.trade/options-sdk';
require('dotenv').config();
// import { addNumbers } from '../lib/arithmetic';


assert(process.env.PK, 'Set your private key in .env');

// This 'sdk' variable is not understood when property 'priceFeed' is included.
// 'const sdk' has to be removed.
/*
const sdk = new OptionsSdk({
  api: {
    url: 'https://api-options.prd.foxify.trade',
  },
  contracts: {
    rpc: 'https://arbitrum-one.publicnode.com',
    privateKey: process.env.PK,
    address: {
      core: '0xec301D5a4ee80DF21E243E5490d29d44B83c27fC',
      stable: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    },
    gasRiskFactor: {
      price: 10n,
      limit: 10n,
    }   
  },
    priceFeed: {
       url: 'https://xc-mainnet.pyth.network',
  }
})
*/
// 'sdk' without 'priceFeed' that works
const sdk = new OptionsSdk({
  contracts: {
    privateKey: process.env.PK,
  },
})


async function main() {

	// const result = addNumbers(2, 3);
	// console.log(`addNumbers : ${result}`); // Output: 5

	const [oracle] = await sdk.api.getOracles();

	// Define the binary option :
	const direction = sdk.contracts.Direction.Up;
	const duration = '15m';
	const percent = 3.0; 
	const rate = 1.31416;
	const amount = 13.5; 

	let doLargeAmountPreapproval = false;
	let doGetOrdersStart = true; // Give a list of orders before we do anything
	let doGetPositions = true; // get our current positions
	let doCreateOrder = false;
	let doIncreaseOrder = false; // Ok but does not display on the GUI for 0.5% (it does for 1%)
	let doCancelOrder = false;
	let doDecreaseOrder = false; // ok
	let doGetPriceFeed = false; // ok
	let doAcceptOrder = false;
	let doGetOrdersFinish = true; // Give a list of orders after everything 
	let doGetPositionsFinish = true;
	// Preapproving a large amount upfront saves on approve txfees whcih are are around 28 USD cents per approval.
	// This needs to be done once for all and does not need to be repeated. 
	// If you want to reestablish approval, set largePreapprovalAmount = 0;

	if (doLargeAmountPreapproval) {
		const largePreapprovalAmount = 1000000; // USDC
		await sdk.contracts.approve(largePreapprovalAmount);
	}

	// Get the Pyth oracles

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
	if (doGetPriceFeed) {
		const [oracle] = await sdk.api.getOracles();

		console.log(`Pyth oracle id for ${oracle.name} (address=${oracle.address})`)
			const latest = await sdk.priceFeed.getLatestPrice(oracle.address);
		console.log('Latest Price Feeds', latest);
		sdk.priceFeed.subscribePriceUpdates(oracle.address, (price) => {
				console.log(`[${new Date().toISOString()}] New price feed received`, price);
				})
	}
	console.log(`Available oracle: ${JSON.stringify(oracle, null, 2)}`);
	console.log(`Working on asset : ${oracle.name}`);

	// let globalOrderId = 581; // Either a hard-coded number, or leave it to null if we create an order and increase/decrease/cancel on this specific order 
	let globalOrderId = 650; // Either a hard-coded number, or leave it to null if we create an order and increase/decrease/cancel on this specific order 
	let globalDbId = 39903;

	if (doGetOrdersStart) {
		// Type IGetOrderParams :
		const orderParams = {
account: sdk.contracts.sender,
	 // closed: true, // status: true=inactive, false=active, both: "closed" bool is absent // FIXME as this is not super 
	 // orderType: 'my_order' | 'all_order', // FIXME
	 // orderType: 'my_order' as const,
	 closed: false, // Select active orders only
	 orderType: 'all_order' as const,  // orderType=all_order -> ALL ORDERS EXCEPT MINE / orderType=my_order -> MY ORDERS ONLY
	 limit: 1000 // Pagination only 
		}

		const orders = await getOrders(); // await sdk.api.getOrders(orderParams);
		const myOrderCount = await sdk.contracts.core.methods.creatorOrdersCount(sdk.contracts.sender).call();

		console.log(`myOrderCount : ${myOrderCount}`);
		console.log(`sender address: ${sdk.contracts.sender}`);
		console.log (`There are ${orders.length} orders`);
		// const nonNulOrders = orders.filter((order) => BigInt(order.available) > 0n);

		// console.log (`BEGIN Displaying orders in human friendly format`);
		for(let i = 0; i < orders.length; i++) {
			// console.log(`rawOrders : ${JSON.stringify(nonNulOrders[i],null,2)}`);
			console.log(`humanReadableOrders : ${JSON.stringify(await displayOrder(orders[i]),null,2)}`); 
		}
		// console.log (`END Displaying orders in human friendly format`);

		// console.log(`------------- Active orders with amount gt 0 ${JSON.stringify(orders, null, 2)}`);

	}

	if (doGetPositions) {
		const { data: positions } = await sdk.api.raw.positions.positionControllerGetPositions(sdk.contracts.sender);
		console.log (`Our current positions : ${JSON.stringify(positions,null,2)} `);
	}

	if (doCreateOrder) {
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
globalOrderId = orderId;
}

// Lift an offer or hit a bid. Choose the blockchainId / localDatabaseId and   
if (doAcceptOrder) {
	const blockchainId = 670;
	const localDbId = 41021; 	
	const orderId = blockchainId;
	const amount = 3; // USDC
	await sdk.contracts.acceptOrders([{ orderId, amount }]);

	const order = await sdk.api.getOrder(localDbId);
	console.log(`order ${JSON.stringify(order, null,2)}  was accepted with amount of ${amount} USDC`);
	console.log(`orderId ${orderId} was traded at market with amount of ${amount} USDC`);
}

if (doIncreaseOrder) {
	const orderId = globalOrderId;
	const diffAmount = 3;
	await sdk.contracts.increaseOrderAmount(orderId, diffAmount);
	console.log(`orderId ${orderId} was increased by ${diffAmount} USDC`);
}

if (doCancelOrder) {
	const orderId = globalOrderId;
	await sdk.contracts.closeOrder(orderId);
	console.log(`orderId #${orderId} was cancelled !`);
}

if (doDecreaseOrder) {
	const orderId = globalOrderId;
	// const diffAmount = 2;
	// ONLY TO COMPUTE THE DIFFAMOUNT, WE USE THE DATABASE ID
	// sdk.api : database id
	// sdk.contracts : blockchain id
	const order = await sdk.api.getOrder(globalDbId);
	const diffAmount = Number(order.available) / 1e6;
	console.log(`orderId #${orderId} has an available amount of ${diffAmount} USDC`);
	await sdk.contracts.decreaseOrderAmount(orderId, diffAmount);
	console.log(`orderId #${orderId} was decreased by available ${diffAmount} USDC`);
}

if (doGetOrdersFinish) {
	// Type IGetOrderParams :
	const orderParams = {
         account: sdk.contracts.sender,
	 // closed: true, // status: inactive, active, all // FIXME
	 // orderType: 'my_order' | 'all_order', // FIXME
	 // orderType: 'my_order' as const,
	 closed: false,
	 orderType: 'my_order' as const,  // all_order : takes all market orders EXCEPT MINE  | my_order : retrieves all orders which are mine
	 limit: 1000 // Pagination only 
	}

	// const orders = await sdk.api.getOrders(orderParams);
	const orders = await getOrders(); //  sdk.api.getOrders(orderParams);
					  // console.log (`FINISH : There are ${orders.length} orders : ${JSON.stringify(orders,null,2)}`);
					  // const myOrderCount = await sdk.contracts.core.methods.creatorOrdersCount(sdk.contracts.sender).call();


	console.log(`FINISH : There are ${orders.length} orders `); 
	for(let i = 0; i < orders.length; i++) {
		// console.log(`FINISH : nonHumanReadableOrders : ${JSON.stringify(await orders[i],null,2)}`); 
		console.log(`FINISH : humanReadableOrders : ${JSON.stringify(await displayOrder(orders[i]),null,2)}`); 
	}

	// console.log(`myOrderCount : ${myOrderCount}`);
	// console.log(`sender address: ${sdk.contracts.sender}`);
}

if (doGetPositionsFinish) {
	const { data: positions }  = await sdk.api.raw.positions.positionControllerGetPositions(sdk.contracts.sender);
	console.log (`FINISH : Updated positions : ${JSON.stringify(positions,null,2)} `);

}
}


// TODO : my_orders | all_orders, 
// active | inactive | both active_and_inactive
async function getOrders() {
	const orderParams = {
         account: sdk.contracts.sender,
	 // closed: true, // status: inactive, active, all // FIXME
	 // orderType: 'my_order' | 'all_order', // FIXME
	 // orderType: 'my_order' as const,
	 closed: false,
	 orderType: 'my_order' as const,  // all_order : takes all market orders EXCEPT MINE  | my_order : retrieves all orders which are mine
	 limit: 1000 // Pagination only 
	}

	const orders = await sdk.api.getOrders(orderParams);
	const nonNulOrders = orders.filter((order) => BigInt(order.available) > 0n);
	return nonNulOrders;
}

async function displayOrder (order:any) {
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
		"amount": Number(order.amount/1e6), //"25900000",
		"reserved": Number(order.reserved)/1e6, // "0",
		"available": Number(order.available)/1e6, // "25900000",
		"percent": Number(order.percent)/1e6/divisor/100, // "1000000100000000000",
		"direction": order.direction,
		"rate": Number(order.rate) / 1e6/divisor, // "810000000000000000",
		"duration": Number(order.duration), // "900",
		"reinvest": order.reinvest, // false,

		// CHECK
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
	// console.log (`${JSON.stringify(humanReadableOrder, null,2)}`);
	return humanReadableOrder 
}

main();
