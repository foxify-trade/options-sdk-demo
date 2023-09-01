import { OptionsSdk } from '@foxify.trade/options-sdk';
import assert from 'assert';

require('dotenv').config();

assert(process.env.PK, 'No private key provided, create .env file!');

const sdk = new OptionsSdk({
	contracts: {
		privateKey: process.env.PK,
	},
});


// Current bug : the id referencing an order is different depending on the modules from which the function is called : 
//   -for all functions called from sdk.api : "myOrder.id" (i.e. database id, accessible through "getDatabaseId(blockchainId)"
//   -for all functions called from sdk.contracts : "myOrder.orderId" (i.e. blockchain id), accessible through "getBlockchainId(databaseId)"

export type OrderStatus = "active" | "inactive" | "activeAndInactive";
export type OrderType = "mine" | "others";

export function createOrderParameters(orderStatus: OrderStatus, orderType: OrderType) {
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
export async function getDatabaseId(blockchainId: number, orderType : OrderType) {
	const orderStatus = "active";
	const orderParams = createOrderParameters(orderStatus, orderType);
	const orders = await sdk.api.getOrders(orderParams);
	const filteredOrders = orders.filter((order) => order.orderId === blockchainId);
	// console.log (`getDatabaseId : filteredOrders = ${JSON.stringify(filteredOrders,null,2)}`);
	const databaseId = filteredOrders[0]?.id;
	return databaseId;
}


// Get a blockchainId ("myOrder.orderId")
export async function getBlockchainId(databaseId: number, orderType : OrderType) {
	const orderStatus = "active";
	const orderParams = createOrderParameters(orderStatus, orderType);
	const orders = await sdk.api.getOrders(orderParams);
	const filteredOrder = orders.filter((order) => order.id === databaseId);

	const blockchainId =  filteredOrder[0]?.orderId;
	return blockchainId;
}

export async function getOrders(orderStatus: OrderStatus, orderType: OrderType) {
	const orderParams = createOrderParameters(orderStatus, orderType);
	const orders = await sdk.api.getOrders(orderParams);
	const nonNullOrders = orders.filter((order) => BigInt(order.available) > 0n);
	return nonNullOrders;
}

export async function displayOrder(order: any) {
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

	const divisor = 1e10;

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
		"percent": Number(order.percent) / 1e6 / divisor - 100,
		"direction": order.direction,
		"rate": 1 + Number(order.rate) / 1e6 / divisor / 100,
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


export async function displayPosition(position: any) {
	// Structure of an position (within a [])
/*	
  {
    "id": 24786,
    "positionId": 2676,
    "owner": "0x4857687bc580ad5266b9e7073beb90722365849b",
    "startTime": "1692735017",
    "endTime": "1692735917",
    "startPrice": "25812872729410000000000",
    "endPrice": "25836589609750000000000",
    "deviationPrice": "25877404911233525000000",
    "amountCreator": "7740000",
    "amountAccepter": "3000000",
    "winner": "0x20ce0c0f284219f4e0b68804a8333a782461674c",
    "status": "executed",
    "isCreatorWinner": true,
    "order": {
      "id": 41021,
      "orderId": 670,
      "creator": "0x20ce0c0f284219f4e0b68804a8333a782461674c",
      "amount": "20000000",
      "reserved": "0",
      "available": "20000000",
      "percent": "1002500000000000000",
      "direction": "up",
      "rate": "2580000000000000000",
      "duration": "900",
      "reinvest": false,
      "oracle": {
        "id": 20734,
        "name": "BTC/USD",
        "address": "0x0015d0ab0e5ac1f31f8c40fcf9844797feeb1b09",
        "priceId": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
        "decimals": "18"
      }
    },
    "autoResolveSnapshot": {
      "txHash": "0xfd036bd5f82b6a003209aac033a8c3db4534d6151367981133f83308b261afb9",
      "orderAvailable": "20000000",
      "protocolStableFee": "80550",
      "autoResolveFee": "978499"
    }
  }

*/

	const divisor = 1e10;

	const latestOraclePx = await sdk.priceFeed.getLatestPrice(position.order.oracle.address);
	const humanReadablePosition = {
		"owner": position.owner, 
		"startTime": new Date(Number(position.startTime)*1000), 
		"endTime": new Date(Number(position.endTime)*1000), 
		"oracle": position.order.oracle.name, 
		"oraclePx": latestOraclePx,
		"startPrice": Number(position.startPrice) / 1e6 / divisor / 100, 
		"strikePrice": Number(position.deviationPrice)/ 1e6 / divisor / 100, 
		"status": position.status, 
                "isCreatorWinner": position.isCreatorWinner,
		"id": position.order.id,
		"orderId": position.order.orderId,
		"creator": position.order.creator,
		"amountCreator": Number(position.amountCreator / 1e6),
		"amountAccepter": Number(position.amountAccepter/ 1e6),
		"reserved": Number(position.order.reserved) / 1e6,
		"available": Number(position.order.available) / 1e6, 
		"percent": Number(position.order.percent) / 1e6 / divisor -100,
		"direction": position.order.direction,
		"rate": 1 + Number(position.order.rate) / 1e6 / divisor / 100,
		"duration": Number(position.order.duration),
		"reinvest": position.order.reinvest
	}
	return humanReadablePosition;
}

// Trade at market an amount in USDC 
// if the resting order in the market is a "sell" (resp. "buy"), then "trade" will "buy" (resp. "sell") from our point of view.
export async function trade( databaseId: number, amount: number) {
		// IMPORTANT : for the moment, there is a current bug : there are two different ids to reference an order, depending from the function that is used : 
        // For all functions requiring an order Id, if functions  are coming from :
		// "sdk.api.xxx.ts" : use "myOrder.id" (internally, it is the database id : use "getDatabaseId()" function): this is the one on the GUI here : to check databaseOrderId 37387 on the GUI, go to page: https://www.beta.foxify.trade/order/37387
		// "sdk.contracts.xxx.ts" : use "myOrder.orderId" (internally, it is the blockchain id : use "getBlockchainId() function")
		const orderType: OrderType = "others"; 
		let blockchainId = await getBlockchainId (databaseId, orderType);
		await sdk.contracts.acceptOrders([{orderId : blockchainId, amount : amount }]); // function "acceptOrders" is used in sdk.contracts, therefore we take the blokchainId

		const order = await sdk.api.getOrder(databaseId);
		console.log(`order ${JSON.stringify(order, null, 2)}  was accepted with amount of ${amount} USDC`);
		console.log(`blockchainId/databaseId ${blockchainId}/${databaseId} was traded at market with amount of ${amount} USDC`);
}

export async function increaseOrderAmount(databaseId: number, diffAmount: number) {
		// "sdk.api.xxx.ts" : use "myOrder.id" (internally, it is the database id : use "getDatabaseId()" function)
		// "sdk.contracts.xxx.ts" : use "myOrder.orderId" (internally, it is the blockchain id : use "getBlockchainId() function")
		const orderType: OrderType = "mine"; 
		const blockchainId = await getBlockchainId(databaseId, orderType);
		await sdk.contracts.increaseOrderAmount(blockchainId, diffAmount);
		console.log(`blockchainId/databaseId ${blockchainId}/${databaseId}  was increased by ${diffAmount} USDC`);
}


export async function cancelOrder (databaseId: number ) {
		const orderType: OrderType = "mine"; 
		const blockchainId = await getBlockchainId(databaseId, orderType);
		await sdk.contracts.closeOrder(blockchainId); // "closeOrder() belongs to sdk.contrats, we have to user the blockchainId
		console.log(`blockchainId/databaseId ${blockchainId}/${databaseId} was cancelled !`);
}


export async function withdrawAmount (databaseId: number, amount: number ) {
                const orderType: OrderType = "mine"; 
		const blockchainId = await getBlockchainId(databaseId, orderType);
		
		const order = await sdk.api.getOrder(databaseId);
		const diffAmount = Math.min(amount, Number(order.available) / 1e6);
		console.log(`blockchainId #${blockchainId}/databaseId #${databaseId} has an available amount of ${diffAmount} USDC`);
		await sdk.contracts.decreaseOrderAmount(blockchainId, diffAmount);
		console.log(`blockchainId #${blockchainId}/databaseId #${databaseId} was decreased by available ${diffAmount} USDC`);

}
