import { OptionsSdk } from '@foxify.trade/options-sdk';
import assert from 'assert';

require('dotenv').config();

assert(process.env.PK, 'No private key provided, create .env file!');

const sdk = new OptionsSdk({
	contracts: {
		privateKey: process.env.PK,
	},
});



// NEW LIB
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
