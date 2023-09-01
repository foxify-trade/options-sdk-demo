import { OptionsSdk } from '@foxify.trade/options-sdk';

require('dotenv').config();

const sdk = new OptionsSdk({
	contracts: {
		privateKey: process.env.PK,
	},
});


export function addNumbers(a: number, b: number): number {
	  return a + b;
}



export type OrderStatus = "active" | "inactive" | "activeAndInactive";
export type OrderType = "mine" | "others";

export async function getOrders(orderStatus: OrderStatus, orderType: OrderType) {
	const orderParams = createOrderParameters(orderStatus, orderType);
	const orders = await sdk.api.getOrders(orderParams);
	const nonNulOrders = orders.filter((order) => BigInt(order.available) > 0n);
	return nonNulOrders;
}


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
		// let myStatus = true;
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